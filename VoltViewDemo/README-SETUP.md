# VoltView - Complete Setup Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

Make sure you have **Node.js** installed on your system.

```bash
# Navigate to backend folder
cd voltview-backend

# Install dependencies
npm install
```

### Step 2: Generate Test Data (Optional)

To populate the database with test data for demonstration:

```bash
cd voltview-backend
node generate-test-data.js
```

This will create 100+ test readings in the database.

### Step 3: Start the Backend Server

**Option A: Using the batch file (Windows)**
```bash
# From the main project folder
START-BACKEND.bat
```

**Option B: Manual start**
```bash
cd voltview-backend
node server.js
```

The server will start on **http://localhost:4000**

### Step 4: Open the Frontend

Open `voltview-frontend/index.html` in your web browser.

The dashboard will automatically connect to the backend and display live data!

---

## 📡 API Endpoints

The backend provides the following endpoints:

### GET /api/latest
Returns the most recent sensor reading.

**Response:**
```json
{
  "id": 123,
  "voltage": 230.5,
  "current": 5.2,
  "power": 1200.6,
  "energy": 5.4,
  "frequency": 50.1,
  "pf": 0.95,
  "timestamp": "2026-02-14T10:30:00.000Z"
}
```

### GET /api/history
Returns historical readings.

**Query Parameters:**
- `limit` - Number of readings to return (default: 100, max: 5000)
- `offset` - Number of readings to skip (default: 0)
- `all=true` - Return all readings

**Example:**
```
GET /api/history?limit=50
GET /api/history?all=true
```

### GET /api/analytics
Returns readings grouped by date for analytics.

**Response:**
```json
{
  "grouped": {
    "2026-02-14": [...readings...],
    "2026-02-13": [...readings...]
  }
}
```

### POST /api/esp32
Receives sensor data from ESP32/hardware device.

**Request Body:**
```json
{
  "voltage": 230.5,
  "current": 5.2,
  "power": 1200.6,
  "energy": 5.4,
  "frequency": 50.1,
  "pf": 0.95
}
```

---

## 🔧 Configuration

### Change Backend URL

If you need to change the backend URL (e.g., for production deployment):

Edit `voltview-frontend/dashboard-api.js`:
```javascript
const API_BASE_URL = 'http://localhost:4000/api';
```

Change to your production URL:
```javascript
const API_BASE_URL = 'https://your-domain.com/api';
```

### Database Location

The SQLite database is stored at:
```
voltview-backend/voltview.db
```

To reset the database, simply delete this file and restart the server.

---

## 📊 Features

### Real-Time Data
- Dashboard updates every **2 seconds**
- Charts update every **10 seconds**
- All mock data removed - everything is live from the database!

### Dashboard Displays:
- ✅ Live Power, Voltage, Current
- ✅ Frequency and Power Factor
- ✅ Energy consumption
- ✅ Load score
- ✅ Recent readings table
- ✅ Historical charts (Power, Voltage, Current, etc.)

### Settings Page:
- ✅ System Name configuration
- ✅ Email Alerts toggle
- ✅ Theme switcher (Cyberpunk / Classic / Dark)
- ✅ All settings saved to localStorage

---

## 🐛 Troubleshooting

### "No data available" message
- Make sure the backend server is running
- Check if the database has data (run generate-test-data.js)
- Check browser console for errors

### Backend won't start
- Ensure Node.js is installed: `node --version`
- Install dependencies: `npm install`
- Check if port 4000 is already in use

### CORS errors
- The backend has CORS enabled for all origins
- Make sure you're opening the HTML file (not file://)
- Consider using a local server like `python -m http.server`

### Charts not displaying
- Make sure Chart.js is loaded (check browser console)
- Verify there's data in the database
- Check that chart canvas elements exist in HTML

---

## 🔐 Security Note

The demo user credentials are:
- **Username:** demo
- **Password:** demo123

These are created automatically when the database initializes.

---

## 📝 Project Structure

```
VoltViewDemo/
├── voltview-backend/
│   ├── server.js           # Express server
│   ├── db.js               # Database setup
│   ├── generate-test-data.js  # Test data generator
│   └── voltview.db         # SQLite database (created automatically)
│
├── voltview-frontend/
│   ├── index.html          # Main dashboard
│   ├── script.js           # Original scripts + theme
│   ├── dashboard-api.js    # NEW: Real API integration
│   ├── style.css           # Main styles
│   ├── ui-improvements.css # UI enhancements
│   └── [other pages]       # Analytics, Reports, Settings, etc.
│
├── START-BACKEND.bat       # Windows startup script
└── README-SETUP.md         # This file
```

---

## 🎯 Next Steps

1. **Connect Real Hardware**: Update your ESP32/sensor to POST data to `/api/esp32`
2. **Deploy to Production**: Deploy backend to a cloud server
3. **Add Authentication**: Implement proper user authentication
4. **Add More Features**: Alerts, notifications, data export, etc.

---

## 💡 Tips

- Open browser DevTools (F12) to see real-time API calls
- Check the Console tab for connection status
- The Network tab shows all API requests
- Backend logs show received data in the terminal

---

## ✅ Verification Checklist

- [ ] Node.js installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] Test data generated (`node generate-test-data.js`)
- [ ] Backend server running (`node server.js`)
- [ ] Frontend opened in browser
- [ ] Dashboard showing "Online" status
- [ ] Data updating in real-time
- [ ] Charts displaying historical data

---

**Enjoy your VoltView dashboard! 🎉**
