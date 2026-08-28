/**
 * Firestore seed script — build order §14.4, mock data spec §13.
 *
 * Populates /trains and /stations (read-only master data) and one demo account
 * with People, saved searches, preferences and an upcoming Journey, so the app
 * looks alive on first load. Train/station *values* are mock; every user action
 * still persists for real.
 *
 * Usage:
 *   1. Put a service-account key at ./serviceAccount.json  (gitignored), OR
 *      run against the emulator with FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.
 *   2. npm run seed
 *
 * The client also seeds a demo account on "Try the instant demo" (src/data/demo.ts),
 * so this script is only needed for a real, shared Firestore project.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

import { STATIONS } from '../src/data/stations';
import { TRAINS } from '../src/data/trains';

const here = dirname(fileURLToPath(import.meta.url));
const projectId = process.env.GCLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID || 'irctc-ri-demo';

function init() {
  if (admin.apps.length) return admin.app();
  const keyPath = resolve(here, '..', 'serviceAccount.json');
  try {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(key), projectId: key.project_id });
  } catch {
    // No key — assume the emulator (FIRESTORE_EMULATOR_HOST) or ADC.
    return admin.initializeApp({ projectId });
  }
}

async function seedMaster(db: admin.firestore.Firestore) {
  console.log(`Seeding ${STATIONS.length} stations…`);
  let batch = db.batch();
  let n = 0;
  const commit = async () => {
    if (n) await batch.commit();
    batch = db.batch();
    n = 0;
  };

  for (const s of STATIONS) {
    batch.set(db.collection('stations').doc(s.code), s);
    if (++n >= 400) await commit();
  }
  await commit();

  console.log(`Seeding ${TRAINS.length} trains…`);
  for (const t of TRAINS) {
    batch.set(db.collection('trains').doc(t.id), t);
    if (++n >= 400) await commit();
  }
  await commit();
}

async function seedDemo(db: admin.firestore.Firestore) {
  const uid = 'demo-ananya';
  console.log(`Seeding demo account /users/${uid}…`);

  const now = Date.now();
  const iso = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  await db.collection('users').doc(uid).set({
    uid,
    aadhaar_ref: 'aad_demo_ananya',
    mobile: '9876543210',
    name: 'Ananya Rao',
    locale: 'en',
    created_at: now,
    home_station: 'MAS',
    preferences: {
      preferred_class: '3A',
      preferred_departure: 'morning',
      max_budget: 1200,
      comfort_over_price: 'sometimes',
      fewer_changes: true,
      personalization_enabled: true,
    },
    preferences_updated_at: now,
  });

  const people = [
    { name: 'Ananya Rao', age: 29, gender: 'F', relation: 'self', is_frequent: true },
    { name: 'Lakshmi Rao', age: 58, gender: 'F', relation: 'mother', is_frequent: true },
    { name: 'Vikram Rao', age: 62, gender: 'M', relation: 'father', is_frequent: true },
    { name: 'Meera Rao', age: 24, gender: 'F', relation: 'sister', is_frequent: false },
  ];
  for (const p of people) {
    await db.collection('users').doc(uid).collection('people').add({
      ...p,
      aadhaar_ref: `aad_demo_${p.name.split(' ')[0].toLowerCase()}`,
      saved_at: now,
    });
  }

  await db.collection('users').doc(uid).collection('saved_searches').add({
    from: 'MAS', to: 'SBC', date: iso(3), class: '3A', note: 'Weekend at home', saved_at: now,
  });

  const train = TRAINS.find((t) => t.number === '12007')!;
  const journeyRef = db.collection('users').doc(uid).collection('journeys').doc();
  const pnr = String(Math.floor(1e9 + Math.random() * 9e9));
  await journeyRef.set({
    pnr,
    train_id: train.id,
    train_number: train.number,
    train_name: train.name,
    from_station: 'MAS',
    to_station: 'SBC',
    journey_date: iso(3),
    departure_time: train.departure_time,
    arrival_time: train.arrival_time,
    duration_minutes: train.duration_minutes,
    class: 'CC',
    quota: 'General',
    passengers: [
      { person_id: 'p1', name: 'Ananya Rao', age: 29, gender: 'F', coach: 'C3', seat_number: '24', berth_type: 'Window', status: 'confirmed' },
    ],
    total_fare: 340,
    fare_breakdown: { base: 300, convenience_fee: 20, insurance: 5, other: 0 },
    status: 'confirmed',
    booking_time: now - 86400000 * 2,
    payment_method: 'upi',
    payment_state: 'confirmed',
    boarding_station: 'MAS',
  });

  await db.collection('pnr_status').doc(pnr).set({
    journey_id: journeyRef.id, user_id: uid, status: 'confirmed',
    seats: ['24'], last_updated: now,
  });
}

async function main() {
  const app = init();
  const db = app.firestore();
  await seedMaster(db);
  await seedDemo(db);
  console.log('\n✓ Seed complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
