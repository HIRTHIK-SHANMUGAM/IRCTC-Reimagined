import type { Journey, Person } from '@/types';
import { repo } from '@/lib/backend';
import { generatePnr } from '@/lib/hash';
import { getTrain } from './trains';
import { addDays } from '@/engine/search';
import { availabilityFor } from '@/engine/availability';
import { computeFare } from '@/store/booking';
import { todayISO } from '@/lib/format';

/**
 * The instant demo. Seeds a believable account so the app looks alive on first
 * load — saved people, past searches, preferences, and one upcoming journey.
 */

export const DEMO_CREDENTIALS = {
  name: 'Ananya Rao',
  mobile: '9876543210',
  // Synthetic. Never a real Aadhaar number, and only ever stored tokenised.
  aadhaar: '499118665246',
  otp: '123456',
};

const DEMO_PEOPLE: Omit<Person, 'id' | 'saved_at'>[] = [
  { name: 'Ananya Rao', age: 29, gender: 'F', aadhaar_ref: '', relation: 'self', is_frequent: true },
  { name: 'Lakshmi Rao', age: 58, gender: 'F', aadhaar_ref: '', relation: 'mother', is_frequent: true },
  { name: 'Vikram Rao', age: 62, gender: 'M', aadhaar_ref: '', relation: 'father', is_frequent: true },
  { name: 'Meera Rao', age: 24, gender: 'F', aadhaar_ref: '', relation: 'sister', is_frequent: false },
];

let seeding = false;

export async function seedDemoAccount(): Promise<void> {
  if (seeding) return;
  seeding = true;
  try {
    const existing = await repo.listJourneys();
    // Already seeded — do not duplicate on a second sign-in.
    if (existing.length > 0) return;

    await repo.updatePreferences({
      preferred_class: '3A',
      preferred_departure: 'morning',
      max_budget: 1200,
      comfort_over_price: 'sometimes',
      fewer_changes: true,
      personalization_enabled: true,
    });
    await repo.updateProfile({ home_station: 'MAS', name: DEMO_CREDENTIALS.name });

    const people = await repo.listPeople();
    for (const p of DEMO_PEOPLE) {
      // The account holder already exists from sign-up.
      if (people.some((x) => x.name === p.name)) continue;
      await repo.addPerson({ ...p, aadhaar_ref: `aad_demo_${p.name.split(' ')[0].toLowerCase()}` });
    }

    await repo.saveSearch({ from: 'MAS', to: 'SBC', date: addDays(todayISO(), 3), class: '3A', note: 'Weekend at home' });
    await repo.saveSearch({ from: 'MAS', to: 'MDU', date: addDays(todayISO(), 12) });

    // One upcoming journey, three days out, so Home and Track have something real.
    const train = getTrain('12007');
    if (train) {
      const date = addDays(todayISO(), 3);
      const availability = availabilityFor(train, 'CC', date);
      const seatHolders = (await repo.listPeople()).slice(0, 2);
      const fare = computeFare(availability.price, seatHolders.length);
      const journey: Omit<Journey, 'id'> = {
        pnr: generatePnr(),
        train_id: train.id,
        train_number: train.number,
        train_name: train.name,
        from_station: 'MAS',
        to_station: 'SBC',
        journey_date: date,
        departure_time: train.departure_time,
        arrival_time: train.arrival_time,
        duration_minutes: train.duration_minutes,
        class: 'CC',
        quota: 'General',
        passengers: seatHolders.map((p, i) => ({
          person_id: p.id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          coach: 'C3',
          seat_number: String(24 + i),
          berth_type: 'Window',
          status: 'confirmed' as const,
        })),
        total_fare: fare.total,
        fare_breakdown: fare,
        status: 'confirmed',
        booking_time: Date.now() - 86400000 * 2,
        payment_method: 'upi',
        payment_state: 'confirmed',
        boarding_station: 'MAS',
      };
      const created = await repo.createJourney(journey);

      await repo.pushNotification({
        priority: 'critical',
        type: 'platform_change',
        title: 'Platform changed for your Bengaluru trip',
        body: `${train.number} now departs from platform 9 instead of platform 5.`,
        journey_id: created.id,
      });
      await repo.pushNotification({
        priority: 'useful',
        type: 'chart_prepared',
        title: 'Nothing needs doing yet',
        body: 'Your chart is prepared four hours before departure. We will tell you then.',
        journey_id: created.id,
      });
    }
  } finally {
    seeding = false;
  }
}
