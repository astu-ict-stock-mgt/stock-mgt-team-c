import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function StoreDetails({
  storeId,
  onBack,
  onEdit,
  onToggleStatus,
}) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadStore() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("stores", storeId);
        if (isMounted) {
          if (!data) setError("Store not found.");
          else setStore(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load store details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (storeId) loadStore();
    return () => { isMounted = false; };
  }, [storeId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Store Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading store details...</div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="master-page">
        <PageHeader title="Store Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Store not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Stores</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <PageHeader
          title={store.name}
          description="Detailed store information"
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Stores
          </button>
          {onEdit && (
            <button type="button" className="secondary-button" onClick={() => onEdit(store)}>
              Edit Store
            </button>
          )}
          {onToggleStatus && (
            <button
              type="button"
              className={store.status === "Active" ? "danger-button" : "success-button"}
              onClick={async () => {
                await onToggleStatus(store);
                // After toggling, we fetch fresh data to update UI
                setLoading(true);
                try {
                  const data = await getResourceById("stores", storeId);
                  if (data) setStore(data);
                } catch (e) {
                  setError("Failed to refresh store status.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {store.status === "Active" ? "Deactivate Store" : "Activate Store"}
            </button>
          )}
        </div>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{store.name}</h1>
            <p>{store.code}</p>
          </div>
          <span className={`status-badge ${store.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {store.status || "Active"}
          </span>
        </div>

        <h2 style={{ marginBottom: "18px", fontSize: "17px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          Store Information
        </h2>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Store Code</span>
            <span className="detail-value" style={{ fontWeight: 'bold' }}>{store.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Store Name</span>
            <span className="detail-value">{store.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Store Type</span>
            <span className="detail-value">{store.type}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Department</span>
            <span className="detail-value">{store.departmentRef?.name || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">{store.location || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">{store.status || "Active"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Description</span>
            <span className="detail-value">{store.description || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreDetails;