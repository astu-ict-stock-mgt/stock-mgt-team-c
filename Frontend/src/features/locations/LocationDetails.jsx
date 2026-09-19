import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function LocationDetails({
  locationId,
  onBack,
  onEdit,
}) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadLocation() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("locations", locationId);
        if (isMounted) {
          if (!data) setError("Location not found.");
          else setLocation(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load location details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (locationId) loadLocation();
    return () => { isMounted = false; };
  }, [locationId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Location Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading location details...</div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="master-page">
        <PageHeader title="Location Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Location not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Locations</button>
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
          ← Back to Locations
        </button>

        {onEdit && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onEdit(location)}
          >
            Edit Location
          </button>
        )}
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{location.code}</h1>
            <p>{location.store || "No Store"} — {location.section || "No Section"}</p>
          </div>
          <span className={`status-badge ${location.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {location.status || "Active"}
          </span>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Location Code</span>
            <span className="detail-value">{location.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Store</span>
            <span className="detail-value">{location.store || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Section</span>
            <span className="detail-value">{location.section || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Shelf</span>
            <span className="detail-value">{location.shelf || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Bin</span>
            <span className="detail-value">{location.bin || "-"}</span>
          </div>

          <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
            <span className="detail-label">Description</span>
            <span className="detail-value">{location.description || "No description provided."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationDetails;