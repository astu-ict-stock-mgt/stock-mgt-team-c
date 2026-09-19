import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function WarehouseDetails({
  warehouseId,
  onBack,
  onEdit,
  onToggleStatus,
}) {
  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadWarehouse() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("warehouses", warehouseId);
        if (isMounted) {
          if (!data) setError("Warehouse not found.");
          else setWarehouse(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load warehouse details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (warehouseId) loadWarehouse();
    return () => { isMounted = false; };
  }, [warehouseId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Warehouse Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading warehouse details...</div>
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="master-page">
        <PageHeader title="Warehouse Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Warehouse not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Warehouses</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <PageHeader
          title={warehouse.name}
          description="Detailed warehouse information"
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Warehouses
          </button>
          {onEdit && (
            <button type="button" className="secondary-button" onClick={() => onEdit(warehouse)}>
              Edit Warehouse
            </button>
          )}
          {onToggleStatus && (
            <button
              type="button"
              className={warehouse.status === "Active" ? "danger-button" : "success-button"}
              onClick={async () => {
                await onToggleStatus(warehouse);
                setLoading(true);
                try {
                  const data = await getResourceById("warehouses", warehouseId);
                  if (data) setWarehouse(data);
                } catch (e) {
                  setError("Failed to refresh warehouse status.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {warehouse.status === "Active" ? "Deactivate Warehouse" : "Activate Warehouse"}
            </button>
          )}
        </div>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{warehouse.name}</h1>
            <p>{warehouse.code}</p>
          </div>
          <span className={`status-badge ${warehouse.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {warehouse.status || "Active"}
          </span>
        </div>

        <h2 style={{ marginBottom: "18px", fontSize: "17px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          Warehouse Information
        </h2>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Warehouse Code</span>
            <span className="detail-value" style={{ fontWeight: 'bold' }}>{warehouse.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Warehouse Name</span>
            <span className="detail-value">{warehouse.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Warehouse Type</span>
            <span className="detail-value">{warehouse.type}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Department</span>
            <span className="detail-value">{warehouse.departmentRef?.name || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">{warehouse.location || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">{warehouse.status || "Active"}</span>
          </div>

          <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
            <span className="detail-label">Description</span>
            <span className="detail-value">{warehouse.description || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WarehouseDetails;