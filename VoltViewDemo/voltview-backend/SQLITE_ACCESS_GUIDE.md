# SQLite3 Database Access Guide

## Overview
Access your `voltview.db` SQLite database with step-by-step instructions.

---

## Method 1: Using SQLite3 Command Line (Recommended for Quick Access)

### Step 1: Install SQLite3

#### On Windows (using Chocolatey):
```bash
choco install sqlite
```

#### On Windows (Manual Download):
1. Go to https://www.sqlite.org/download.html
2. Download `sqlite-tools-win32-x86-3460000.zip` (or latest version)
3. Extract to a folder and add to PATH, or use the full path to `sqlite3.exe`

#### On macOS:
```bash
brew install sqlite3
```

#### On Linux:
```bash
sudo apt-get install sqlite3
```

### Step 2: Open the Database

Navigate to the backend folder and open the database:

```bash
cd C:\Users\jaypa\Downloads\VoltViewDemo\VoltViewDemo\voltview-backend
sqlite3 voltview.db
```

### Step 3: Common SQLite Commands

Once inside the SQLite prompt (`sqlite>`), try these commands:

```sql
-- List all tables
.tables

-- View table structure
.schema users
.schema readings

-- View all users
SELECT * FROM users;

-- View all readings
SELECT * FROM readings;

-- View first 10 readings
SELECT * FROM readings LIMIT 10;

-- View latest readings
SELECT * FROM readings ORDER BY timestamp DESC LIMIT 10;

-- Count total readings
SELECT COUNT(*) FROM readings;

-- Average voltage
SELECT AVG(voltage) FROM readings;

-- Exit SQLite
.quit
```

---

## Method 2: Using DB Browser for SQLite (GUI - Easiest)

### Step 1: Download and Install

1. Go to https://sqlitebrowser.org/
2. Download the installer for Windows
3. Run the installer and follow prompts

### Step 2: Open Database

1. Launch "DB Browser for SQLite"
2. Click `File` → `Open Database`
3. Navigate to: `C:\Users\jaypa\Downloads\VoltViewDemo\VoltViewDemo\voltview-backend\voltview.db`
4. Click `Open`

### Step 3: Browse Data

- **Browse Data tab**: View tables with GUI
- **Execute SQL tab**: Run custom SQL queries
- **Edit Pragmas tab**: Modify database settings

---

## Method 3: Using Node.js (Programmatic Access)

Already installed in your project! Run from the backend folder:

```bash
cd C:\Users\jaypa\Downloads\VoltViewDemo\VoltViewDemo\voltview-backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./voltview.db');

console.log('===== READINGS (Latest 10) =====');
db.all('SELECT * FROM readings ORDER BY timestamp DESC LIMIT 10', (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
"
```

---

## Method 4: Export and View in Excel/Google Sheets

### CSV Export (Already Done!)

The file `voltview_readings.csv` contains all readings. Open with:
- Microsoft Excel
- Google Sheets
- Any text editor

### JSON Export (Already Done!)

The file `voltview_data.json` contains all data in JSON format. View with:
- Text editors (VS Code, Notepad++)
- Online JSON viewers
- Any programming language

---

## Useful SQLite Queries

```sql
-- Statistics
SELECT COUNT(*) as total_readings, 
       AVG(voltage) as avg_voltage,
       AVG(current) as avg_current,
       AVG(power) as avg_power
FROM readings;

-- Readings from specific date
SELECT * FROM readings 
WHERE timestamp LIKE '2025-11-25%';

-- High voltage readings (>122V)
SELECT * FROM readings 
WHERE voltage > 122 
ORDER BY voltage DESC;

-- Hourly average power
SELECT DATE(timestamp) as date, 
       STRFTIME('%H', timestamp) as hour,
       AVG(power) as avg_power
FROM readings 
GROUP BY date, hour;

-- Export as CSV from SQLite
.mode csv
.output readings_export.csv
SELECT * FROM readings;
.output stdout
```

---

## Quick Start

**Fastest way to access your data:**

```bash
# Option A: Using SQLite CLI
cd C:\Users\jaypa\Downloads\VoltViewDemo\VoltViewDemo\voltview-backend
sqlite3 voltview.db "SELECT * FROM readings LIMIT 5;"

# Option B: Open exported CSV
Start-Process "voltview_readings.csv"

# Option C: Open exported JSON
code voltview_data.json
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `sqlite3: command not found` | Install SQLite3 (see Step 1 above) |
| Database locked | Close other connections and try again |
| Permission denied | Check file permissions: `icacls voltview.db /grant Everyone:F` |
| No data showing | Verify ESP32 is sending data to backend |

---

## Files Available

| File | Purpose |
|------|---------|
| `voltview.db` | SQLite database (original) |
| `voltview_data.json` | JSON export (all tables) |
| `voltview_readings.csv` | CSV export (easy Excel import) |

