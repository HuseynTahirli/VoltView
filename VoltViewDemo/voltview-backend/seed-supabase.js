/**
 * seed-supabase.js
 * Inserts ~100 test readings into Supabase spanning the last 7 days.
 * Run once to populate the dashboard with visible data.
 *
 * Usage:
 *   node seed-supabase.js
 */

const supabase = require('./supabaseClient');

function generateReading(timestamp) {
  const voltage   = parseFloat((218 + Math.random() * 8).toFixed(3));
  const current   = parseFloat((0.5 + Math.random() * 9).toFixed(4));
  const power     = parseFloat((voltage * current * (0.82 + Math.random() * 0.16)).toFixed(3));
  const energy    = parseFloat((power / 1000 * (15 / 60)).toFixed(5)); // kWh per 15-min slot
  const frequency = parseFloat((49.6 + Math.random() * 0.8).toFixed(3));
  const pf        = parseFloat((0.82 + Math.random() * 0.16).toFixed(4));
  return { voltage, current, power, energy, frequency, pf, timestamp };
}

async function seed() {
  const now = Date.now();
  const readings = [];

  // 7 days × ~14 readings/day (every ~100 min) = ~98 readings
  for (let i = 97; i >= 0; i--) {
    const ts = new Date(now - i * 100 * 60 * 1000).toISOString(); // every ~100 minutes
    readings.push(generateReading(ts));
  }

  console.log(`\nInserting ${readings.length} test readings into Supabase...`);

  // Supabase insert in one batch (max ~1000 rows per call)
  const { data, error } = await supabase
    .from('readings')
    .insert(readings)
    .select('id');

  if (error) {
    console.error('\n❌ Insert failed:', error.message);
    console.error('   Make sure SUPABASE_SERVICE_KEY is set in .env so RLS is bypassed.');
    process.exit(1);
  }

  console.log(`✅ Inserted ${data.length} readings successfully.`);
  console.log('\nYou can now open the dashboard — charts and tables will be populated.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
