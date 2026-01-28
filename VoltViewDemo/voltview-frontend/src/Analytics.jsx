
import { useEffect, useState, useMemo } from "react";

function Analytics() {
  const [grouped, setGrouped] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [live, setLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // fetch function exposed for manual refresh and polling
  const doFetch = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/history?all=true");
      const rows = await res.json();
      const groupedLocal = {};
      (rows || []).forEach((r) => {
        const date = r.timestamp ? r.timestamp.slice(0, 10) : "unknown";
        if (!groupedLocal[date]) groupedLocal[date] = [];
        groupedLocal[date].push(r);
      });
      const ordered = Object.keys(groupedLocal)
        .sort()
        .reduce((acc, d) => {
          acc[d] = groupedLocal[d];
          return acc;
        }, {});
      setGrouped(ordered);
      const dates = Object.keys(ordered);
      if (dates.length) setSelectedDate(dates[dates.length - 1]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch readings:", err);
      setGrouped({});
    }
  };

  useEffect(() => {
    // initial fetch
    doFetch();

    // polling when live
    let id = null;
    if (live) id = setInterval(doFetch, 5000);
    return () => {
      if (id) clearInterval(id);
    };
  }, [live]);

  const summary = useMemo(() => {
    const dates = Object.keys(grouped);
    let total = 0;
    dates.forEach((d) => (total += grouped[d].length));
    return {
      dayCount: dates.length,
      totalReadings: total,
      dates,
    };
  }, [grouped]);

  return (
    <div style={{ padding: 32, color: "#e6eef8", fontFamily: "Inter, system-ui", background: "#071027", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>Readings Report</h1>
        <p style={{ color: "#9fb3d1", marginTop: 0 }}>
          Historical readings stored in <code>voltview.db</code>. Use the selector to view readings by date.
        </p>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
          <div style={{ background: "#021122", padding: 12, borderRadius: 8 }}>
            <div style={{ color: "#9fb3d1", fontSize: 12 }}>Total readings</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.totalReadings}</div>
          </div>
          <div style={{ background: "#021122", padding: 12, borderRadius: 8 }}>
            <div style={{ color: "#9fb3d1", fontSize: 12 }}>Days available</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.dayCount}</div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <label style={{ color: "#9fb3d1", marginRight: 8 }}>Select date:</label>
            <select value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #14324a", background: "#021122", color: "#e6eef8" }}>
              {summary.dates.map((d) => (
                <option key={d} value={d}>{d} ({grouped[d].length})</option>
              ))}
            </select>
          </div>
        </div>

        {summary.dayCount === 0 && <p style={{ marginTop: 24, color: "#cbd5e1" }}>No readings found.</p>}
        {summary.dayCount === 1 && (
          <div style={{ marginTop: 16, padding: 12, background: "#082233", borderRadius: 8, color: "#ffdca3" }}>
            Only one day of readings available ({summary.dates[0]}). Data will still display below.
          </div>
        )}

        {selectedDate && grouped[selectedDate] && (
          <div style={{ marginTop: 20 }}>
            <h2 style={{ color: "#dbe9ff" }}>{selectedDate} — {grouped[selectedDate].length} readings</h2>
            <div style={{ overflowX: "auto", background: "#021122", padding: 12, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6eef8" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #133a53" }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: "#9fb3d1" }}>Time</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: "#9fb3d1" }}>Voltage (V)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: "#9fb3d1" }}>Current (A)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: "#9fb3d1" }}>Power (W)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: "#9fb3d1" }}>Energy (kWh)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: "#9fb3d1" }}>Freq (Hz)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: "#9fb3d1" }}>PF</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[selectedDate].map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(19,58,83,0.12)" }}>
                      <td style={{ padding: "8px 10px" }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.voltage}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.current}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.power}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.energy ? r.energy.toFixed(3) : "--"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.frequency ? r.frequency.toFixed(1) : "--"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.pf ? r.pf.toFixed(2) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
