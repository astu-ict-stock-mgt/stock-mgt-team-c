import { useState, useEffect } from "react";
import PageHeader from "../../../components/common/PageHeader";
import { fetchResource } from "../../../api/masterData";
import { reconcile } from "./reconciliationData";

export default function Reconciliation() {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [physicalQuantity, setPhysicalQuantity] = useState("");

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [itemsData, locationsData] = await Promise.all([
          fetchResource("items"),
          fetchResource("locations"),
        ]);
        setItems(itemsData);
        setLocations(locationsData);
      } catch (err) {
        console.error("Failed to load master data", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadMasterData();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!itemId || !locationId || physicalQuantity === "") {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await reconcile({
        itemId,
        locationId,
        physicalQuantity: Number(physicalQuantity),
      });
      setResult(response?.data || null);
    } catch (x) {
      setError(x.message || "Failed to reconcile stock.");
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setItemId("");
    setLocationId("");
    setPhysicalQuantity("");
    setResult(null);
    setError("");
  };

  const getStatusColor = (status) => {
    return status === "MATCHED" ? "green" : "red";
  };

  if (loadingData) {
    return (
      <div className="page-container">
        <PageHeader
          title="Stock Reconciliation"
          description="Compare physical count with authoritative system balance."
        />
        <div style={{ padding: "32px", textAlign: "center" }}>Loading form...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Stock Reconciliation"
        description="Compare physical count with authoritative system balance."
      />

      <div className="form-card" style={{ maxWidth: "600px", marginBottom: "24px" }}>
        {error && (
          <div className="error-message" style={{ color: "red", padding: "12px", marginBottom: "16px", background: "#fdf2f2", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="reconciliation-item">Item *</label>
              <select
                id="reconciliation-item"
                value={itemId}
                onChange={e => setItemId(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">-- Select Item --</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="reconciliation-location">Location *</label>
              <select
                id="reconciliation-location"
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">-- Select Location --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="reconciliation-physical">Physical Quantity *</label>
              <input
                id="reconciliation-physical"
                type="number"
                step="0.001"
                placeholder="Enter physical count"
                value={physicalQuantity}
                onChange={e => setPhysicalQuantity(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? "Calculating..." : "Reconcile"}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="details-card" style={{ maxWidth: "600px" }}>
          <div className="page-header" style={{ marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "18px", margin: "0" }}>Reconciliation Result</h2>
            </div>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
                background: result.status === "MATCHED" ? "#d4edda" : "#f8d7da",
                color: getStatusColor(result.status)
              }}
            >
              {result.status}
            </span>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">System Quantity (Authoritative)</span>
              <span className="detail-value">{result.systemQuantity}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Physical Quantity (Counted)</span>
              <span className="detail-value">{result.physicalQuantity}</span>
            </div>

            <div className="detail-item" style={{ gridColumn: "1 / -1", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "8px" }}>
              <span className="detail-label">Discrepancy (Physical - System)</span>
              <span className="detail-value" style={{ fontSize: "18px", fontWeight: "bold", color: getStatusColor(result.status) }}>
                {result.discrepancy > 0 ? "+" : ""}{result.discrepancy}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
