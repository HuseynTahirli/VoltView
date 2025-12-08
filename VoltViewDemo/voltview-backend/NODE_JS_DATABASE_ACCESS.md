# Access voltview.db Using Node.js

## Overview
Use Node.js and the sqlite3 package to query your `voltview.db` database directly. **No installation required** - sqlite3 is already installed in your project!

---

## Prerequisites

✓ Node.js installed  
✓ sqlite3 npm package installed (already in `package.json`)  
✓ `voltview.db` file in the backend folder

---

## Quick Start

### Step 1: Navigate to Backend Directory
```bash
cd C:\Users\jaypa\Downloads\VoltViewDemo\VoltViewDemo\voltview-backend
```

### Step 2: Run a Query
Copy and paste any command below in your terminal (bash or PowerShell):

---

## Common Queries

### 1. View All Readings
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** Table with all 1,224+ sensor readings

---

### 2. View Last 10 Readings (Most Recent First)
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings ORDER BY timestamp DESC LIMIT 10', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** Latest 10 readings in reverse chronological order

---

### 3. View First 10 Readings
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings LIMIT 10', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** First 10 readings from the database

---

### 4. View All Users
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT id, username FROM users', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** Username and ID of all users

---

### 5. Count Total Readings
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.get('SELECT COUNT(*) as total FROM readings', (err, row) => { console.log('Total readings:', row.total); db.close(); });"
```

**Output:**
```
Total readings: 1224
```

---

### 6. Database Statistics
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.get('SELECT COUNT(*) as total, AVG(voltage) as avg_voltage, AVG(current) as avg_current, AVG(power) as avg_power FROM readings', (err, row) => { console.table([row]); db.close(); });"
```

**Output:** Summary statistics of all readings

---

### 7. Check Latest Reading
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** Most recent sensor reading with timestamp

---

### 8. Find High Voltage Readings (>122V)
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings WHERE voltage > 122 ORDER BY voltage DESC LIMIT 10', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** Top 10 highest voltage readings above 122V

---

### 9. Readings from Specific Date
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings WHERE timestamp LIKE \"2025-11-25%\" LIMIT 20', (err, rows) => { console.table(rows); db.close(); });"
```

**Output:** All readings from November 25, 2025 (first 20)

---

### 10. Database Status Check
```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.get('SELECT COUNT(*) as total FROM readings', (err, row) => { console.log('Total readings:', row.total); }); db.all('SELECT MAX(timestamp) as latest, MIN(timestamp) as oldest FROM readings', (err, row) => { console.log('Date range:', row[0].oldest, 'to', row[0].latest); db.close(); });"
```

**Output:**
```
Total readings: 1224
Date range: 2025-11-24T04:25:59.561Z to 2025-12-04T18:20:10.989Z
```

---

## How It Works

### Breakdown of a Query

```bash
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./voltview.db'); db.all('SELECT * FROM readings LIMIT 10', (err, rows) => { console.table(rows); db.close(); });"
```

| Part | Explanation |
|------|-------------|
| `node -e` | Execute JavaScript code in Node.js |
| `require('sqlite3')` | Load the SQLite3 package |
| `.Database('./voltview.db')` | Connect to the database file |
| `db.all(...)` | Run a SELECT query and get all results |
| `console.table(rows)` | Display results in a formatted table |
| `db.close()` | Close the database connection |

---

## Create a Reusable Script

For easier access, create a file: `query.js`

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./voltview.db');

// Query to run (modify as needed)
const query = process.argv[2] || 'SELECT * FROM readings LIMIT 10';

db.all(query, (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.table(rows);
  }
  db.close();
});
```

**Usage:**
```bash
# View 10 readings
node query.js "SELECT * FROM readings LIMIT 10"

# View latest reading
node query.js "SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1"

# Count total
node query.js "SELECT COUNT(*) as total FROM readings"
```

---

## Useful SQL Queries

### Average Power Consumption
```sql
SELECT AVG(power) as avg_power FROM readings;
```

### Max and Min Voltage
```sql
SELECT MAX(voltage) as max_v, MIN(voltage) as min_v FROM readings;
```

### Readings by Hour
```sql
SELECT STRFTIME('%Y-%m-%d %H:00:00', timestamp) as hour, AVG(power) as avg_power 
FROM readings 
GROUP BY hour 
ORDER BY hour DESC LIMIT 24;
```

### Readings in Time Range
```sql
SELECT * FROM readings 
WHERE timestamp BETWEEN '2025-11-24' AND '2025-11-25' 
ORDER BY timestamp;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'sqlite3'` | Run `npm install` in voltview-backend folder |
| `database is locked` | Close other database connections |
| `ENOENT: no such file or directory` | Ensure you're in the correct directory with `voltview.db` |
| No output | Add error handling: `if (err) console.error(err);` |

---

## Table Structure

### readings table
```
id (INTEGER PRIMARY KEY)
voltage (REAL) - in volts
current (REAL) - in amps
power (REAL) - in kilowatts
timestamp (TEXT) - ISO 8601 format
```

### users table
```
id (INTEGER PRIMARY KEY)
username (TEXT UNIQUE)
password_hash (TEXT)
```

---

## Tips & Best Practices

1. **Use LIMIT** to avoid overwhelming output with large datasets
2. **Use ORDER BY** to sort results meaningfully
3. **Use WHERE** clauses to filter specific data
4. **Use db.close()** to properly close connections
5. **Use db.get()** for single row queries (faster than db.all)
6. **Use console.table()** for readable formatted output

---

## Next Steps

- Export data to CSV: See `SQLITE_ACCESS_GUIDE.md`
- Use DB Browser GUI: Download from https://sqlitebrowser.org/
- Create a web dashboard: Use the Express backend to fetch and display data
- Analyze data: Use the JSON/CSV exports in Python or R

