# VoltView - PZEM-004T Power Monitoring System

Real-time power monitoring application using ESP32 + PZEM-004T sensor with web dashboard.

## Features

- ⚡ Real-time voltage, current, power monitoring
- 📊 Energy consumption tracking (kWh)
- 🌊 AC frequency measurement
- 📈 Power factor analysis
- 📱 Responsive web dashboard
- 💾 SQLite database storage
- 📉 Historical data analytics

## Hardware Requirements

- ESP32 development board
- PZEM-004T V3.0 power meter sensor
- WiFi connection

## Hardware Connections

```
ESP32 Pin 16 (RX) → PZEM TX
ESP32 Pin 17 (TX) → PZEM RX
```

## Quick Start

### 1. Backend Server

Open a terminal and run:

```bash
cd c:/Users/jaypa/Downloads/VoltViewDemo/VoltViewDemo/voltview-backend
node server.js
```

**Expected output:**
```
🔥 VoltView backend running at http://localhost:4000
```

### 2. Frontend Server

Open a **separate terminal** and run:

```bash
cd c:/Users/jaypa/Downloads/VoltViewDemo/VoltViewDemo/voltview-frontend
npm run dev
```

**Expected output:**
```
➜  Local:   http://localhost:5173/
```

### 3. Access the Application

1. Open browser: **http://localhost:5173/**
2. Login credentials:
   - Username: `demo`
   - Password: `demo123`

### 4. Upload Arduino Code

1. Open `PZEM_VoltView/PZEM_VoltView.ino` in Arduino IDE
2. Install PZEM004Tv30 library (Sketch → Manage Libraries)
3. Update WiFi credentials in the code
4. Upload to ESP32
5. Open Serial Monitor (115200 baud) to verify connection

## Project Structure

```
VoltViewDemo/
├── PZEM_VoltView/              # Arduino ESP32 code
│   └── PZEM_VoltView.ino       # Main sketch with PZEM + WiFi
├── VoltViewDemo/
│   ├── voltview-backend/       # Node.js backend server
│   │   ├── server.js           # Express API server
│   │   ├── db.js               # SQLite database setup
│   │   └── voltview.db         # SQLite database file
│   └── voltview-frontend/      # React frontend
│       └── src/
│           ├── App.jsx         # Main dashboard
│           └── Analytics.jsx   # Analytics page
```

## API Endpoints

- `POST /api/esp32` - Receive sensor data from ESP32
- `GET /api/latest` - Get latest reading
- `GET /api/history` - Get historical readings
- `GET /api/analytics` - Get analytics data
- `POST /api/login` - User authentication

## Database Schema

**readings table:**
- `id` - Auto-increment primary key
- `voltage` - Voltage (V)
- `current` - Current (A)
- `power` - Power (W)
- `energy` - Energy consumption (kWh)
- `frequency` - AC frequency (Hz)
- `pf` - Power factor
- `timestamp` - ISO timestamp

## Troubleshooting

### ESP32 WiFi Connection Issues
- Ensure iPhone hotspot is ON
- Enable "Maximize Compatibility" (forces 2.4GHz)
- Check WiFi credentials in Arduino code
- Move ESP32 closer to router

### Backend Issues
- Check if port 4000 is available
- Verify Node.js is installed
- Run `npm install` in backend directory

### Frontend Issues
- Check if port 5173 is available
- Verify Node.js is installed
- Run `npm install` in frontend directory

## Technologies Used

- **Frontend:** React, Vite, Chart.js
- **Backend:** Node.js, Express, SQLite3
- **Hardware:** ESP32, PZEM-004T V3.0
- **Libraries:** PZEM004Tv30, WiFi, HTTPClient

## License

MIT
