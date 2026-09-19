import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function ItemDetails({
  itemId,
  onBack,
  onEdit,
}) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadItem() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("items", itemId);
        if (isMounted) {
          if (!data) setError("Item not found.");
          else setItem(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load item details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (itemId) loadItem();
    return () => { isMounted = false; };
  }, [itemId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Item Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading item details...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="master-page">
        <PageHeader title="Item Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Item not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Items</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back to Items
        </button>

        {onEdit && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onEdit(item)}
          >
            Edit Item
          </button>
        )}
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{item.name}</h1>
            <p>{item.code}</p>
          </div>
          <span className={`status-badge ${item.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {item.status || "Active"}
          </span>
        </div>

        <h2 style={{ marginBottom: "18px", fontSize: "17px" }}>Basic Information</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Item Code</span>
            <span className="detail-value">{item.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Item Name</span>
            <span className="detail-value">{item.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Category</span>
            <span className="detail-value">{item.category || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Item Type</span>
            <span className="detail-value">{item.type || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Unit</span>
            <span className="detail-value">{item.unit || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Store</span>
            <span className="detail-value">{item.store || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">{item.location || "Not assigned"}</span>
          </div>
        </div>

        <h2 style={{ margin: "30px 0 18px", fontSize: "17px" }}>Stock Control</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Minimum Stock</span>
            <span className="detail-value">{item.minimum} {item.unit}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Maximum Stock</span>
            <span className="detail-value">{item.maximum} {item.unit}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Reorder Level</span>
            <span className="detail-value">{item.reorder} {item.unit}</span>
          </div>
        </div>

        <h2 style={{ margin: "30px 0 18px", fontSize: "17px" }}>Description</h2>
        <p>{item.description || "No description provided."}</p>
      </div>
    </div>
  );
}

export default ItemDetails;