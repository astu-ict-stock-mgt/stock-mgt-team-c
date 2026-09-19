import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function ShelfDetails({
  shelfId,
  onBack,
  onEdit,
  onToggleStatus,
}) {
  const [shelf, setShelf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadShelf() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("shelves", shelfId);
        if (isMounted) {
          if (!data) setError("Shelf not found.");
          else setShelf(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load shelf details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (shelfId) loadShelf();
    return () => { isMounted = false; };
  }, [shelfId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Shelf Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading shelf details...</div>
      </div>
    );
  }

  if (error || !shelf) {
    return (
      <div className="master-page">
        <PageHeader title="Shelf Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Shelf not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Shelves</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <PageHeader
          title={shelf.name}
          description="Detailed shelf information"
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Shelves
          </button>
          {onEdit && (
            <button type="button" className="secondary-button" onClick={() => onEdit(shelf)}>
              Edit Shelf
            </button>
          )}
          {onToggleStatus && (
            <button
              type="button"
              className={shelf.status === "Active" ? "danger-button" : "success-button"}
              onClick={async () => {
                await onToggleStatus(shelf);
                setLoading(true);
                try {
                  const data = await getResourceById("shelves", shelfId);
                  if (data) setShelf(data);
                } catch (e) {
                  setError("Failed to refresh shelf status.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {shelf.status === "Active" ? "Deactivate Shelf" : "Activate Shelf"}
            </button>
          )}
        </div>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{shelf.name}</h1>
            <p>{shelf.code}</p>
          </div>
          <span className={`status-badge ${shelf.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {shelf.status || "Active"}
          </span>
        </div>

        <h2 style={{ marginBottom: "18px", fontSize: "17px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          Shelf Information
        </h2>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Shelf Code</span>
            <span className="detail-value" style={{ fontWeight: 'bold' }}>{shelf.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Shelf Name</span>
            <span className="detail-value">{shelf.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Warehouse</span>
            <span className="detail-value">{shelf.warehouse || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Section</span>
            <span className="detail-value">{shelf.section || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">{shelf.status || "Active"}</span>
          </div>

          <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
            <span className="detail-label">Description</span>
            <span className="detail-value">{shelf.description || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShelfDetails;