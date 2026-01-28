// src/App.jsx
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Analytics from "./Analytics.jsx";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

// ===================== LOGIN COMPONENT =====================

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Login failed");
        return;
      }

      onLoginSuccess(data.username);
    } catch (err) {
      console.error("Login error:", err);
      setError("Could not reach server");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui",
        backgroundColor: "#020617",
        color: "white",
      }}
    >
      <div
        style={{
          backgroundColor: "#020617",
          padding: "32px 36px",
          borderRadius: "16px",
          width: "340px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
          border: "1px solid #1e293b",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "6px",
            fontSize: "1.6rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span role="img" aria-label="bolt">
            ⚡
          </span>
          VoltView Login
        </h1>
        <p
          style={{
            marginTop: 0,
            marginBottom: "18px",
            fontSize: "0.9rem",
            color: "#9ca3af",
          }}
        >
          Sign in to access the real-time power dashboard.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: "0.85rem" }}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                marginTop: "4px",
                marginBottom: "12px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #374151",
                backgroundColor: "#020617",
                color: "white",
              }}
            />
          </label>

          <label style={{ fontSize: "0.85rem" }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                marginTop: "4px",
                marginBottom: "16px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #374151",
                backgroundColor: "#020617",
                color: "white",
              }}
            />
          </label>

          {error && (
            <p
              style={{
                color: "#fecaca",
                backgroundColor: "#7f1d1d",
                padding: "6px 8px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                marginTop: 0,
                marginBottom: "10px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#22c55e",
              color: "#052e16",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Log In
          </button>

          <p
            style={{
              marginTop: "10px",
              fontSize: "0.78rem",
              color: "#9ca3af",
            }}
          >
            Demo credentials: username <strong>demo</strong>, password{" "}
            <strong>demo123</strong>.
          </p>
        </form>
      </div>
    </div>
  );
}


import { useNavigate } from "react-router-dom";

function Dashboard({ username }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch("http://localhost:4000/api/latest"),
        fetch("http://localhost:4000/api/history"),
      ]);
      const latestData = await latestRes.json();
      const historyData = await historyRes.json();
      setLatest(latestData);
      setHistory(historyData);
    } catch (err) {
      console.error("Backend not running?", err);
    }
  };

  useEffect(() => {
    fetchData();
    if (!isLive) return;
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, [isLive]);

  const chartData = {
    labels: history.map((r) =>
      new Date(r.timestamp).toLocaleTimeString("en-US", { hour12: false })
    ),
    datasets: [
      {
        label: "Power (kW)",
        data: history.map((r) => r.power),
        tension: 0.3,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.2)",
      },
    ],
  };

  return (
    <div
      style={{
        fontFamily: "system-ui",
        color: "white",
        backgroundColor: "#020617",
        minHeight: "100vh",
        padding: "24px 56px 40px",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.1rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: 0,
            }}
          >
            <span role="img" aria-label="bolt">
              ⚡
            </span>
            VoltView Dashboard
          </h1>
          <p
            style={{
              color: "#94a3b8",
              marginTop: "6px",
              marginBottom: 0,
              fontSize: "0.9rem",
            }}
          >
            Logged in as <strong>{username}</strong> • Real-time PZEM-004T readings
          </p>
        </div>
        <button
          onClick={() => navigate("/analytics")}
          style={{
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 18px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(59,130,246,0.15)",
          }}
        >
          Go to Analytics
        </button>
      </header>

      {/* Main two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.3fr)",
          gap: "28px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT PANEL: stats + table */}
        <div>
          {/* Live stats cards - 6 metrics grid */}
          {latest ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {/* Voltage Card */}
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    background: "radial-gradient(circle at top left, #1e293b, #020617)",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.85rem" }}>
                    ⚡ Voltage
                  </h3>
                  <p style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0 0", color: "#fbbf24" }}>
                    {latest.voltage} V
                  </p>
                </div>

                {/* Current Card */}
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    background: "radial-gradient(circle at top left, #1e293b, #020617)",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.85rem" }}>
                    🔌 Current
                  </h3>
                  <p style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0 0", color: "#60a5fa" }}>
                    {latest.current} A
                  </p>
                </div>

                {/* Power Card */}
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    background: "radial-gradient(circle at top left, #1e293b, #020617)",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.85rem" }}>
                    💡 Power
                  </h3>
                  <p style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0 0", color: "#22c55e" }}>
                    {latest.power} W
                  </p>
                </div>

                {/* Energy Card */}
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    background: "radial-gradient(circle at top left, #1e293b, #020617)",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.85rem" }}>
                    📊 Energy
                  </h3>
                  <p style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0 0", color: "#a78bfa" }}>
                    {latest.energy ? latest.energy.toFixed(3) : "0.000"} kWh
                  </p>
                </div>

                {/* Frequency Card */}
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    background: "radial-gradient(circle at top left, #1e293b, #020617)",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.85rem" }}>
                    🌊 Frequency
                  </h3>
                  <p style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0 0", color: "#f472b6" }}>
                    {latest.frequency ? latest.frequency.toFixed(1) : "--"} Hz
                  </p>
                </div>

                {/* Power Factor Card */}
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    background: "radial-gradient(circle at top left, #1e293b, #020617)",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.85rem" }}>
                    📈 Power Factor
                  </h3>
                  <p style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0 0", color: "#fb923c" }}>
                    {latest.pf ? latest.pf.toFixed(2) : "--"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsLive((prev) => !prev)}
                style={{
                  width: "100%",
                  marginBottom: "20px",
                  backgroundColor: isLive ? "#22c55e" : "#0ea5e9",
                  color: "#020617",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {isLive ? "⏸ Pause Live Data" : "▶ Resume Live Data"}
              </button>
            </>
          ) : (
            <p>Waiting for data...</p>
          )}

          {/* Recent readings table */}
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "16px",
              padding: "16px 16px 10px",
              border: "1px solid #1f2937",
              boxShadow: "0 12px 30px rgba(15,23,42,0.6)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "10px",
                fontSize: "1.1rem",
              }}
            >
              Recent Readings
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.86rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#020617", color: "#cbd5e1" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Time</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Voltage</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Current</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Power</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Energy</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>PF</th>
                </tr>
              </thead>
              <tbody>
                {[...history]
                  .reverse()
                  .slice(0, 10)
                  .map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>
                        {new Date(r.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>
                        {r.voltage}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>
                        {r.current}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>
                        {r.power}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>
                        {r.energy ? r.energy.toFixed(3) : "--"}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#e5e7eb" }}>
                        {r.pf ? r.pf.toFixed(2) : "--"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL: chart */}
        <div
          style={{
            backgroundColor: "#020617",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            padding: "18px 18px 16px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.6)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "10px",
              fontSize: "1.1rem",
            }}
          >
            Power over Time
          </h2>
          <Line data={chartData} />
        </div>
      </div>
    </div>
  );
}




function App() {
  const [username, setUsername] = useState(null);

  if (!username) {
    return <Login onLoginSuccess={setUsername} />;
  }

  return (
    <Router>
      <nav style={{ background: "#e5e7eb", padding: "10px 24px", display: "flex", gap: "18px" }}>
        <Link to="/" style={{ color: "#1e293b", fontWeight: 600, textDecoration: "none" }}>Dashboard</Link>
        <Link to="/analytics" style={{ color: "#1e293b", fontWeight: 600, textDecoration: "none" }}>Analytics</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard username={username} />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
}

export default App;
