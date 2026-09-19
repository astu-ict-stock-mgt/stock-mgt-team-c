import { useState, useEffect } from "react";
import { fetchResource } from "../../../api/masterData";
import { createAdjustment } from "./stockAdjustmentData";

function StockAdjustmentForm({ onSubmitSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    itemId: "",
    locationId: "",
    quantity: "",
    reason: "",
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.itemId || !formData.locationId || !formData.quantity || !formData.reason.trim()) {
      setError("All required fields must be completed.");
      return;
    }

    const qty = Number(formData.quantity);
    if (qty === 0 || isNaN(qty)) {
      setError("Adjustment quantity must be a non-zero number.");
      return;
    }

    setSubmitting(true);
    try {
      await createAdjustment({
        itemId: formData.itemId,
        locationId: formData.locationId,
        quantity: Math.abs(qty),
        direction: qty > 0 ? "INCREASE" : "DECREASE",
        reason: formData.reason,
      });
      onSubmitSuccess();
    } catch (err) {
      setError(err.message || "Failed to submit stock adjustment.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "32px", textAlign: "center" }}>Loading form...</div>;
  }

  return (
    <div className="form-card">
      {error && (
        <div className="error-message" style={{ color: "red", marginBottom: "16px", padding: "12px", background: "#fdf2f2", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Item *</label>
            <select
              name="itemId"
              value={formData.itemId}
              onChange={handleChange}
              required
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <select
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              required
            >
              <option value="">Select Location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Adjustment Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="Example: 10 or -5"
              required
            />
          </div>

          <div className="form-group">
            {/* empty spacing block for layout */}
          </div>

          <div className="form-group full-width">
            <label>Reason *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Explain why the stock adjustment is required."
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="danger-button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Adjustment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockAdjustmentForm;