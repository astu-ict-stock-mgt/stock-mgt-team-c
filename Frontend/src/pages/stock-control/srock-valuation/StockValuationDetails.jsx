import { useEffect, useState } from "react";
import { getItemValuation } from "./stockValuationData";

function StockValuationDetails({ row, asOfDate, locationName, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDetails() {
      try {
        const response = await getItemValuation(row.itemId, row.locationId, asOfDate);
        setDetails(response?.data || null);
      } catch (err) {
        setError(err.message || "Failed to load detailed FIFO layers.");
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [row, asOfDate]);

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back to Valuation
        </button>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{row.itemName}</h1>
            <p>Code: {row.itemCode} • Location: {locationName}</p>
            {asOfDate && <p>As of Date: {new Date(asOfDate).toLocaleDateString()}</p>}
          </div>
        </div>

        {error ? (
          <div className="error-message" style={{ color: "red", padding: "16px" }}>{error}</div>
        ) : loading ? (
          <div style={{ padding: "32px", textAlign: "center" }}>Loading detailed valuation layers...</div>
        ) : details ? (
          <>
            <div className="details-grid" style={{ marginBottom: "24px" }}>
              <div className="detail-item">
                <span className="detail-label">Total Quantity</span>
                <span className="detail-value">{details.quantity}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total FIFO Value</span>
                <span className="detail-value">
                  {Number(details.fifoValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cost Data Complete</span>
                <span className="detail-value" style={{ color: details.costDataComplete ? "green" : "red", fontWeight: "bold" }}>
                  {details.costDataComplete ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <h3 style={{ marginBottom: "16px", color: "#333", fontSize: "16px" }}>FIFO Cost Layers</h3>
            {(!details.layers || details.layers.length === 0) ? (
              <p style={{ color: "#666" }}>No specific layers found.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Layer Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.layers.map((layer, index) => (
                      <tr key={layer.transactionId || index}>
                        <td>{layer.transactionId || "Unknown"}</td>
                        <td>{layer.remainingQuantity}</td>
                        <td>{layer.unitCost !== null && layer.unitCost !== undefined 
                              ? Number(layer.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                              : "Missing"}</td>
                        <td>{layer.unitCost !== null && layer.unitCost !== undefined
                              ? (Number(layer.remainingQuantity) * Number(layer.unitCost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p>No details available.</p>
        )}
      </div>
    </div>
  );
}

export default StockValuationDetails;