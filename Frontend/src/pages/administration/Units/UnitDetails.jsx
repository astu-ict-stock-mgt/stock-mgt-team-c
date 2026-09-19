import { useEffect, useState } from "react";
import PageHeader from "../../../components/common/PageHeader";
import { getResourceById } from "../../../api/masterData";

function UnitDetails({ unitId, onBack, onEdit }) {
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadUnit() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("units", unitId);
        if (isMounted) {
          if (!data) setError("Unit not found.");
          else setUnit(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load unit details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (unitId) loadUnit();
    return () => { isMounted = false; };
  }, [unitId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Unit Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading unit details...</div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="master-page">
        <PageHeader title="Unit Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Unit not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Units</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <PageHeader
          title={unit.name}
          description="Detailed unit of measure information"
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Units
          </button>
          {onEdit && (
            <button type="button" className="primary-button" onClick={() => onEdit(unit)}>
              Edit Unit
            </button>
          )}
        </div>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{unit.name}</h1>
            <p>{unit.code}</p>
          </div>
          <span className={`status-badge ${unit.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {unit.status || "Active"}
          </span>
        </div>

        <h2 style={{ marginBottom: "18px", fontSize: "17px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          Unit Information
        </h2>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Unit Code</span>
            <span className="detail-value" style={{ fontWeight: 'bold' }}>{unit.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Unit Name</span>
            <span className="detail-value">{unit.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">{unit.status || "Active"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Description</span>
            <span className="detail-value">{unit.description || "-"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Linked Items</span>
            <span className="detail-value">
              {unit._count?.items ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnitDetails;