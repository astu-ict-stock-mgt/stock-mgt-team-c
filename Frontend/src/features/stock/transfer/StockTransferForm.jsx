import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createTransfer } from "../../../api/stockTransfers";
import { fetchResource } from "../../../api/masterData";
import "../StockPage.css";

function StockTransferForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(() => ({
    sourceLocationId: "",
    destinationLocationId: "",
    reason: "",
    remarks: "",
  }));

  const [itemsList, setItemsList] = useState([{ itemId: "", quantity: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadMasterData() {
      try {
        const [itemsData, locationsData] = await Promise.all([
          fetchResource("items", { limit: 100 }),
          fetchResource("locations", { limit: 100 }),
        ]);
        if (mounted) {
          setItems(itemsData);
          setLocations(locationsData);
        }
      } catch (err) {
        console.error("Failed to load master data for transfers:", err);
      }
    }
    loadMasterData();
    return () => { mounted = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...itemsList];
    newItems[index][field] = value;
    setItemsList(newItems);
    setError("");
  };

  const addItemRow = () => {
    setItemsList([...itemsList, { itemId: "", quantity: "" }]);
  };

  const removeItemRow = (index) => {
    if (itemsList.length === 1) return;
    const newItems = [...itemsList];
    newItems.splice(index, 1);
    setItemsList(newItems);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!formData.sourceLocationId || !formData.destinationLocationId) {
      setError("Please select source and destination locations.");
      return;
    }

    if (formData.sourceLocationId === formData.destinationLocationId) {
      setError("Source and destination locations must be different.");
      return;
    }

    // Validate items
    const validItems = [];
    for (const it of itemsList) {
      if (!it.itemId || !it.quantity) {
        setError("Please complete all item fields.");
        return;
      }
      const qty = Number(it.quantity);
      if (qty <= 0) {
        setError("Quantity must be greater than zero.");
        return;
      }
      validItems.push({ itemId: it.itemId, quantity: qty });
    }

    const transferData = {
      sourceLocationId: formData.sourceLocationId,
      destinationLocationId: formData.destinationLocationId,
      reason: formData.reason,
      remarks: formData.remarks,
      items: validItems
    };

    setLoading(true);
    setError("");

    try {
      const created = await createTransfer(transferData);
      navigate(`/stock-transfers/${created.id || created.transferNumber || created.id}`);
    } catch (err) {
      console.error("Failed to save transfer:", err);
      setError(err?.message || "Unable to save transfer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-page">
      <div className="stock-page-header">
        <div>
          <Link to="/stock-transfers">← Back to Transfers</Link>
          <h1>New Stock Transfer</h1>
          <p>Create a new stock transfer between stores and locations.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {/* ITEMS SECTION */}
        <div className="form-section">
          <h2>Transfer Items</h2>
          {itemsList.map((row, index) => (
            <div className="form-grid" key={index} style={{ marginBottom: "1rem", alignItems: "end" }}>
              <div className="form-group">
                <label>Item ID</label>
                <select
                  value={row.itemId}
                  onChange={(e) => handleItemChange(index, "itemId", e.target.value)}
                  required
                  className="select-input"
                >
                  <option value="" disabled>Select Item</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              {itemsList.length > 1 && (
                <div className="form-group">
                  <button type="button" className="danger-button" onClick={() => removeItemRow(index)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}

          <button type="button" className="secondary-button" onClick={addItemRow}>
            + Add Another Item
          </button>
        </div>

        {/* MOVEMENT */}
        <div className="form-section">
          <h2>Stock Movement</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="sourceLocationId">Source Location ID</label>
              <select
                id="sourceLocationId"
                name="sourceLocationId"
                value={formData.sourceLocationId}
                onChange={handleChange}
                required
                className="select-input"
              >
                <option value="" disabled>Select Source Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{`Loc ${loc.code} - ${loc.store?.name || ''}`}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="destinationLocationId">Destination Location ID</label>
              <select
                id="destinationLocationId"
                name="destinationLocationId"
                value={formData.destinationLocationId}
                onChange={handleChange}
                required
                className="select-input"
              >
                <option value="" disabled>Select Destination Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{`Loc ${loc.code} - ${loc.store?.name || ''}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* REASON */}
        <div className="form-section">
          <h2>Transfer Reason</h2>
          <div className="form-group">
            <label htmlFor="reason">Reason</label>
            <textarea
              id="reason"
              name="reason"
              rows="5"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Enter reason for this stock transfer..."
              required
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="form-actions">
          <Link to="/stock-transfers" className="danger-button">
            Cancel
          </Link>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockTransferForm;