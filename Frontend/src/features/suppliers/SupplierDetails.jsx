import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function SupplierDetails({
  supplierId,
  onBack,
  onEdit,
}) {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadSupplier() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("suppliers", supplierId);
        if (isMounted) {
          if (!data) setError("Supplier not found.");
          else setSupplier(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load supplier details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (supplierId) loadSupplier();
    return () => { isMounted = false; };
  }, [supplierId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Supplier Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading supplier details...</div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="master-page">
        <PageHeader title="Supplier Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Supplier not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Suppliers</button>
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
          ← Back to Suppliers
        </button>

        {onEdit && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onEdit(supplier)}
          >
            Edit Supplier
          </button>
        )}
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{supplier.name}</h1>
            <p>{supplier.code}</p>
          </div>
          <span className={`status-badge ${supplier.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {supplier.status || "Active"}
          </span>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Supplier Code</span>
            <span className="detail-value">{supplier.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Supplier Name</span>
            <span className="detail-value">{supplier.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Contact Person</span>
            <span className="detail-value">{supplier.contact || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{supplier.phone || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{supplier.email || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Address</span>
            <span className="detail-value">{supplier.address || "-"}</span>
          </div>

          <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
            <span className="detail-label">Description</span>
            <span className="detail-value">{supplier.description || "No description provided."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierDetails;