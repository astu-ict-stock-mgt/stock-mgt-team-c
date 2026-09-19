import { useEffect, useState } from "react";
import PageHeader from "../../../components/common/PageHeader";
import { getResourceById } from "../../../api/masterData";

function DepartmentDetails({ departmentId, onBack, onEdit }) {
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadDepartment() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("departments", departmentId);
        if (isMounted) {
          if (!data) setError("Department not found.");
          else setDepartment(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load department details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (departmentId) loadDepartment();
    return () => { isMounted = false; };
  }, [departmentId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Department Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading department details...</div>
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="master-page">
        <PageHeader title="Department Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Department not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Departments</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <PageHeader
          title={department.name}
          description="Detailed department information"
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Departments
          </button>
          {onEdit && (
            <button type="button" className="primary-button" onClick={() => onEdit(department)}>
              Edit Department
            </button>
          )}
        </div>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{department.name}</h1>
            <p>{department.code}</p>
          </div>
          <span className={`status-badge ${department.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {department.status || "Active"}
          </span>
        </div>

        <h2 style={{ marginBottom: "18px", fontSize: "17px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          Department Information
        </h2>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Department Code</span>
            <span className="detail-value" style={{ fontWeight: 'bold' }}>{department.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Department Name</span>
            <span className="detail-value">{department.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">{department.status || "Active"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Description</span>
            <span className="detail-value">{department.description || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepartmentDetails;