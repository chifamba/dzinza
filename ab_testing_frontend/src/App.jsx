import React, { useState } from "react";

function App() {
  const [variant, setVariant] = useState(null);
  const [result, setResult] = useState(null);

  const assignVariant = async () => {
    // Simulate backend assignment
    const assigned = Math.random() < 0.5 ? "A" : "B";
    setVariant(assigned);
    setResult(null);
  };

  const fetchResults = async () => {
    // Simulate fetching results
    setResult({
      A: { conversions: 120, users: 1000 },
      B: { conversions: 140, users: 980 },
    });
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>A/B Testing Frontend</h1>
      <button onClick={assignVariant}>Assign Variant</button>
      {variant && (
        <div style={{ marginTop: 16 }}>
          Assigned Variant: <b>{variant}</b>
        </div>
      )}
      <button style={{ marginTop: 32 }} onClick={fetchResults}>
        View Results
      </button>
      {result && (
        <div style={{ marginTop: 16 }}>
          <h2>Results</h2>
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Conversions</th>
                <th>Users</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A</td>
                <td>{result.A.conversions}</td>
                <td>{result.A.users}</td>
                <td>
                  {((result.A.conversions / result.A.users) * 100).toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td>B</td>
                <td>{result.B.conversions}</td>
                <td>{result.B.users}</td>
                <td>
                  {((result.B.conversions / result.B.users) * 100).toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
