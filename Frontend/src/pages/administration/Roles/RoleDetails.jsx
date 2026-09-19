import { useEffect, useState } from "react";
import PageHeader from "../../../components/common/PageHeader";
import roleData from "./roleData";

function RoleDetails({
  roleId,
  onBack,
  onEdit,
}) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function fetchRole() {
      setLoading(true);
      try {
        const data = await roleData.getById(roleId);
        if (isMounted) {
          if (!data) setError("Role not found.");
          else setRole(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load role details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchRole();
    return () => { isMounted = false; };
  }, [roleId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Role Details" />
        <p>Loading role details...</p>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="master-page">
        <PageHeader title="Role Details" />
        <p className="form-error" style={{ color: 'red' }}>{error || "Role not found."}</p>
        <button className="secondary-button" onClick={onBack}>Back to Roles</button>
      </div>
    );
  }

  const hasFullAccess = role.permissions?.some(p => p.key === "*");

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <PageHeader
          title={role.name}
          description={role.description || "Detailed role information and assigned permissions."}
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Roles
          </button>
          {onEdit && (
            <button type="button" className="primary-button" onClick={() => onEdit(role.id)}>
              Edit Role
            </button>
          )}
        </div>
      </div>

      <div className="details-grid">
        <div className="details-card">
          <h3>Role Information</h3>
          <div className="detail-row">
            <span className="detail-label">Role Name</span>
            <span className="detail-value" style={{ fontWeight: 'bold' }}>{role.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Description</span>
            <span className="detail-value">{role.description || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Users Assigned</span>
            <span className="detail-value">{role.userCount || 0} user(s)</span>
          </div>
        </div>

        <div className="details-card">
          <h3>Assigned Permissions</h3>
          {hasFullAccess ? (
            <div style={{ padding: '1rem', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '4px', color: '#0d47a1', fontWeight: 'bold' }}>
              ⭐ Full Access (All Permissions)
            </div>
          ) : (
            <div className="detail-row">
              <span className="detail-label">Permissions ({role.permissions?.length || 0})</span>
              <span className="detail-value">
                {role.permissions && role.permissions.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#444' }}>
                    {role.permissions.map(p => (
                      <li key={p.id}>
                        <strong>{p.key}</strong>
                        {p.description && <span style={{ color: '#777', marginLeft: '0.5rem', fontWeight: 'normal' }}>- {p.description}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "No specific permissions assigned"
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoleDetails;