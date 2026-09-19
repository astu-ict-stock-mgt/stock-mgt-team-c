import { useState, useEffect } from "react";
import { fetchResource } from "../../../api/masterData";
import { createShelfLifeBatch } from "../../../api/shelfLife";
import "../control.css";

function RegisterBatchModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    itemId: "",
    locationId: "",
    batchNumber: "",
    expiryDate: "",
    quantity: ""
  });

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [itemsData, locationsData] = await Promise.all([
          fetchResource("items"),
          fetchResource("locations")
        ]);
        setItems(itemsData);
        setLocations(locationsData);
      } catch (err) {
        setError("Failed to load items and locations.");
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemId || !formData.locationId || !formData.batchNumber || !formData.expiryDate || !formData.quantity) {
      setError("All fields are required.");
      return;
    }
    
    const qty = Number(formData.quantity);
    if (qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await createShelfLifeBatch({
        itemId: formData.itemId,
        locationId: formData.locationId,
        batchNumber: formData.batchNumber,
        expiryDate: formData.expiryDate,
        quantity: qty
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to register batch.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div className="modal-content" style={{ padding: "2rem", textAlign: "center", background: "white", borderRadius: "8px" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="modal-content form-card" style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Register Batch</h2>
        
        {error && (
          <div className="error-message" style={{ color: "red", marginBottom: "1rem", padding: "0.5rem", background: "#fdf2f2", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Item *</label>
            <select name="itemId" value={formData.itemId} onChange={handleChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}>
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Location *</label>
            <select name="locationId" value={formData.locationId} onChange={handleChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}>
              <option value="">Select Location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.code}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Batch Number *</label>
            <input type="text" name="batchNumber" value={formData.batchNumber} onChange={handleChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Expiry Date *</label>
            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Quantity *</label>
            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} disabled={submitting} className="secondary-button" style={{ padding: "0.5rem 1rem", border: "1px solid #ccc", background: "white", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} className="primary-button" style={{ padding: "0.5rem 1rem", border: "none", background: "#3b82f6", color: "white", borderRadius: "4px", cursor: "pointer" }}>
              {submitting ? "Registering..." : "Register Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterBatchModal;
