// Generate test data for VoltView database
const db = require('./db');

console.log('📊 Generating test data for VoltView...');

// Function to generate random reading
function generateReading() {
  const voltage = 220 + Math.random() * 20; // 220-240V
  const current = 1 + Math.random() * 10; // 1-11A
  const power = voltage * current * (0.8 + Math.random() * 0.2); // Power with some PF variation
  const energy = Math.random() * 10; // Random energy reading
  const frequency = 49.5 + Math.random() * 1; // 49.5-50.5Hz
  const pf = 0.8 + Math.random() * 0.2; // 0.8-1.0 Power Factor

  return { voltage, current, power, energy, frequency, pf };
}

// Generate readings for the last 24 hours
function generateHistoricalData() {
  const now = new Date();
  const readings = [];

  // Generate 100 readings spread over last 24 hours
  for (let i = 100; i >= 0; i--) {
    const timestamp = new Date(now - i * 15 * 60 * 1000); // Every 15 minutes
    const reading = generateReading();
    readings.push({
      ...reading,
      timestamp: timestamp.toISOString()
    });
  }

  return readings;
}

// Insert test data
function insertTestData() {
  const readings = generateHistoricalData();
  let inserted = 0;

  console.log(`\nInserting ${readings.length} test readings...`);

  const stmt = db.prepare(`
    INSERT INTO readings (voltage, current, power, energy, frequency, pf, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  readings.forEach(r => {
    stmt.run([r.voltage, r.current, r.power, r.energy, r.frequency, r.pf, r.timestamp], (err) => {
      if (err) {
        console.error('Error inserting reading:', err);
      } else {
        inserted++;
        if (inserted % 20 === 0) {
          console.log(`  Inserted ${inserted}/${readings.length} readings...`);
        }
      }
    });
  });

  stmt.finalize(() => {
    console.log(`\n✅ Successfully inserted ${inserted} test readings!`);
    console.log('\nTest data summary:');

    db.get('SELECT COUNT(*) as count FROM readings', [], (err, row) => {
      if (!err) {
        console.log(`  Total readings in database: ${row.count}`);
      }
    });

    db.get('SELECT * FROM readings ORDER BY id DESC LIMIT 1', [], (err, row) => {
      if (!err && row) {
        console.log(`  Latest reading:`);
        console.log(`    Voltage: ${row.voltage.toFixed(2)}V`);
        console.log(`    Current: ${row.current.toFixed(2)}A`);
        console.log(`    Power: ${row.power.toFixed(2)}W`);
        console.log(`    Frequency: ${row.frequency.toFixed(2)}Hz`);
        console.log(`    Power Factor: ${row.pf.toFixed(2)}`);
      }

      setTimeout(() => {
        db.close(() => {
          console.log('\n✅ Database connection closed');
          console.log('\n🚀 You can now start the backend server with: node server.js');
          process.exit(0);
        });
      }, 100);
    });
  });
}

// Check if database has data
db.get('SELECT COUNT(*) as count FROM readings', [], (err, row) => {
  if (err) {
    console.error('Error checking database:', err);
    process.exit(1);
  }

  const count = row.count;
  console.log(`\nCurrent readings in database: ${count}`);

  if (count > 0) {
    console.log('\n⚠️  Database already has data!');
    console.log('Do you want to add more test data? This will ADD to existing data.');
    console.log('To clear database first, delete voltview.db file and run this script again.');
    console.log('\nAdding test data in 3 seconds... Press Ctrl+C to cancel');

    setTimeout(() => {
      insertTestData();
    }, 3000);
  } else {
    console.log('\n✅ Database is empty, adding test data...');
    insertTestData();
  }
});
