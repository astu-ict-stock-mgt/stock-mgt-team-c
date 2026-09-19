import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createDisposal } from "../../api/disposal";
import { fetchResource } from "../../api/masterData";

import "./control.css";

function DisposalNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemId: "",
    locationId: "",
    quantity: "",
    reason: "",
  });

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoadingData(true);
        setError("");
        const [fetchedItems, fetchedLocations] = await Promise.all([
          fetchResource("items", { status: "Active" }),
          fetchResource("locations", { status: "Active" }),
        ]);
        if (!mounted) return;
        setItems(fetchedItems || []);
        setLocations(fetchedLocations || []);
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load items and locations for disposal.");
        }
        console.error("Failed to load master data:", err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.itemId || !form.locationId) {
      setError("Item and Location are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await createDisposal({
        itemId: form.itemId,
        locationId: form.locationId,
        quantity: Number(form.quantity),
        reason: form.reason
      });
      navigate("/disposal");
    } catch (err) {
      setError(err?.message || "Failed to create disposal request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="control-page">
      <div className="page-header">
        <div>
          <button type="button" className="back-link" onClick={() => navigate("/disposal")}>
            ← Back to Disposals
          </button>
          <h1>New Disposal Request</h1>
          <p>Flag damaged or obsolete materials for disposal review.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error" style={{ marginBottom: "20px" }}>{error}</div>}

        <div className="form-grid">
          <div className="form-group full-width">
            <label>Item</label>
            <select
              name="itemId"
              value={form.itemId}
              onChange={handleChange}
              disabled={loadingData}
              required
            >
              <option value="">Select an Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Location (Store/Bin)</label>
            <select
              name="locationId"
              value={form.locationId}
              onChange={handleChange}
              disabled={loadingData}
              required
            >
              <option value="">Select a Location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} {loc.store?.name ? `(${loc.store.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Reason</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Explain why the material should be disposed..."
              rows="3"
              required
            />
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: "2rem" }}>
          <button
            type="button"
            className="danger-button"
            onClick={() => navigate("/disposal")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={loading || loadingData}
          >
            {loading ? "Creating..." : "Create Disposal Request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DisposalNew;