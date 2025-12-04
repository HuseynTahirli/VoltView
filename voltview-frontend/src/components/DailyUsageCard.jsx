// src/components/DailyUsageCard.jsx
import { useEffect, useState } from "react";

export default function DailyUsageCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("http://localhost:4000/api/usage-last-24h");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load daily usage:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();

    // refresh every 30 seconds
    const id = setInterval(fetchUsage, 30000);
    return () => clearInterval(id);
  }, []);

  const cardStyle = {
    padding: "1rem",
    borderRadius: "0.75rem",
    border: "1px solid #1f2937",
    background: "#020617",
    maxWidth: "260px",
    boxShadow: "0 8px 18px rgba(15,23,42,0.8)",
  };

  if (loading || !data) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
          Last 24 hours usage
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "1.4rem" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
        Last 24 hours usage
      </div>
      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "1.6rem",
          fontWeight: 600,
        }}
      >
        {data.kWh.toFixed(2)} kWh
      </div>
      <div
        style={{
          marginTop: "0.25rem",
          fontSize: "0.85rem",
          color: "#e5e7eb",
        }}
      >
        Avg power: {data.avgPower.toFixed(2)} kW
      </div>
      <div
        style={{
          marginTop: "0.25rem",
          fontSize: "0.75rem",
          color: "#6b7280",
        }}
      >
        Data points: {data.numPoints}
      </div>
    </div>
  );
}
