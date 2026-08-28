import { rulesTurn } from '../src/engine/intent';
import { rankTrains, bucketResults, smartAlternatives, addDays, formatDuration } from '../src/engine/search';
import { availabilityLabel } from '../src/engine/availability';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = addDays(today, 1);

const probes = [
  'I need to go Bangalore from Chennai tomorrow morning, under 1000, comfortable',
  'Naalaiku morning Chennai la irundhu Madurai poganum',
  'kal subah Bangalore chahiye',
  'where is 12627',
  'chennai to coimbatore on friday 2 people sleeper',
  'I want to sleep, chennai to delhi',
  'somewhere cheap for the weekend',
];

for (const p of probes) {
  const t = rulesTurn(p);
  console.log(`\n> ${p}`);
  console.log(`  intent=${t.intent} entities=${JSON.stringify(t.entities)}`);
  console.log(`  say: ${t.response_text}`);
}

console.log('\n=== SEARCH MAS -> SBC ===');
const rows = rankTrains({ from: 'MAS', to: 'SBC', date: tomorrow, quota: 'General', passengers: 1 });
console.log(`candidates: ${rows.length}`);
for (const r of bucketResults(rows)) {
  const a = availabilityLabel(r.availability);
  console.log(
    `[${r.bucket}] ${r.train.number} ${r.train.name.en} ${r.travel_class} ₹${r.price} ` +
      `${formatDuration(r.train.duration_minutes)} | ${a.headline} | ${r.reasons[0]}`,
  );
}

console.log('\n=== ALTERNATIVES (impossible query) ===');
for (const alt of smartAlternatives({ from: 'MAS', to: 'SBC', date: tomorrow, quota: 'General', passengers: 1, travel_class: '1A', budget: 200 })) {
  console.log(`- ${alt.label}: ${alt.reason}`);
}
