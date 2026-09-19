import { useEffect, useState } from "react";
import PageHeader from "../../../components/common/PageHeader";
import EmptyState from "../../../components/common/EmptyState";
import { apiRequest } from "../../../api/client";
import { getItemValuation } from "./fifoData";

export default function FIFO() {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [asOfDate, setAsOfDate] = useState("");

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMasterData() {
      try {
        const response = await apiRequest("/stock-control/valuation/options");
        const itemsData = response?.data?.items || [];
        const locationsData = response?.data?.locations || [];
        setItems(itemsData);
        setLocations(locationsData);
      } catch (err) {
        console.error("Failed to load master data for FIFO", err);
      }
    }
    loadMasterData();
  }, []);

  useEffect(() => {
    setData(null);
  }, [itemId, locationId, asOfDate]);

  async function calculate() {
    if (!itemId || !locationId) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await getItemValuation(itemId, locationId, asOfDate);
      setData(response?.data || null);
    } catch (e) {
      setError(e.message || "Failed to calculate FIFO valuation.");
    } finally {
      setLoading(false);
    }
  }

  const locationName = (() => {
    const l = locations.find(loc => loc.id === locationId);
    if (!l) return locationId;
    const parts = [l.code, l.section, l.bin].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : (l.name || l.id);
  })();

  return (
    <div className="page-container">
      <PageHeader 
        title="FIFO Valuation Breakdown" 
        description="Detailed remaining FIFO layers for a specific item and location." 
      />

      {/* Selectors */}
      <div className="toolbar" style={{ marginBottom: "20px" }}>
        <div className="toolbar-left" style={{ flexWrap: "wrap", gap: "10px", width: "100%" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Item</label>
            <select
              className="filter-select"
              style={{ width: "100%" }}
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">-- Select Item --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Location</label>
            <select
              className="filter-select"
              style={{ width: "100%" }}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">-- Select Location --</option>
              {locations.map(loc => {
                const parts = [loc.code, loc.section, loc.bin].filter(Boolean);
                const label = parts.length > 0 ? parts.join(" - ") : (loc.name || loc.id);
                return <option key={loc.id} value={loc.id}>{label}</option>
              })}
            </select>
          </div>

          <div style={{ minWidth: "150px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>As of Date (Optional)</label>
            <input
              type="date"
              className="filter-select"
              style={{ width: "100%" }}
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button 
              type="button" 
              className="primary-button" 
              disabled={!itemId || !locationId || loading} 
              onClick={calculate}
            >
              Calculate FIFO
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ color: "red", padding: "16px", marginBottom: "16px", background: "#fdf2f2", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: "32px", textAlign: "center" }}>Computing FIFO layers...</div>
      )}

      {!loading && !error && data && (
        <div className="details-card" style={{ marginTop: "24px" }}>
          <div className="page-header">
            <div>
              <h1>{data.item?.name}</h1>
              <p>Code: {data.item?.code} • Location: {locationName}</p>
              {asOfDate && <p>As of Date: {new Date(asOfDate).toLocaleDateString()}</p>}
            </div>
          </div>

          <div className="details-grid" style={{ marginBottom: "24px" }}>
            <div className="detail-item">
              <span className="detail-label">Total Remaining Quantity</span>
              <span className="detail-value">{data.quantity}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total FIFO Value</span>
              <span className="detail-value">
                {Number(data.fifoValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Cost Data Complete</span>
              <span className="detail-value" style={{ color: data.costDataComplete ? "green" : "red", fontWeight: "bold" }}>
                {data.costDataComplete ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {!data.costDataComplete && (
            <div style={{ background: "#fff3cd", color: "#856404", padding: "12px", marginBottom: "20px", borderRadius: "4px", fontSize: "14px" }}>
              <strong>⚠️ Missing Cost Data:</strong> Some of the layers below have no recorded unit cost. The total FIFO value ignores these quantities.
            </div>
          )}

          <h3 style={{ marginBottom: "16px", color: "#333", fontSize: "16px" }}>Remaining FIFO Layers</h3>
          
          {(!data.layers || data.layers.length === 0) ? (
            <EmptyState title="No stock" message="No remaining inbound layers found for this item." />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction #</th>
                    <th>Remaining Qty</th>
                    <th>Unit Cost</th>
                    <th>Layer Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.layers.map((layer, index) => (
                    <tr key={layer.transactionId || index}>
                      <td>{layer.date ? new Date(layer.date).toLocaleString() : "Unknown"}</td>
                      <td>{layer.transactionNumber || "Unknown"}</td>
                      <td>{layer.remainingQuantity}</td>
                      <td>
                        {layer.unitCost !== null && layer.unitCost !== undefined 
                          ? Number(layer.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                          : <span style={{ color: "red", fontWeight: "bold" }}>Missing</span>}
                      </td>
                      <td>
                        {layer.unitCost !== null && layer.unitCost !== undefined
                          ? (Number(layer.remainingQuantity) * Number(layer.unitCost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
