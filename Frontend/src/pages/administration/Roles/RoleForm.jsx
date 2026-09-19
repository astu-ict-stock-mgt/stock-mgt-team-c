import { useState, useEffect } from "react";
import PageHeader from "../../../components/common/PageHeader";
import roleData from "./roleData";

function RoleForm({
  roleId = null,
  onSaveSuccess,
  onCancel,
}) {
  const isEditing = Boolean(roleId);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [],
  });

  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const perms = await roleData.listPermissions();
        if (isMounted) setAvailablePermissions(perms);

        if (isEditing) {
          const role = await roleData.getById(roleId);
          if (isMounted && role) {
            setFormData({
              name: role.name || "",
              description: role.description || "",
              permissions: Array.isArray(role.permissions)
                ? role.permissions.map(p => p.id || p)
                : [],
            });
          } else if (isMounted) {
            setError("Role not found.");
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load form data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [roleId, isEditing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permissionId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permissionId)
          : [...prev.permissions, permissionId],
      };
    });
  };

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      permissions: availablePermissions.map(p => p.id)
    }));
  };

  const handleClearAll = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  const validate = () => {
    const errs = [];
    if (!formData.name.trim() || formData.name.length < 2) {
      errs.push("Role Name must be at least 2 characters.");
    }
    setValidationErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!validate()) return;
    setSaving(true);

    try {
      if (isEditing) {
        await roleData.update(roleId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          permissions: formData.permissions
        });
      } else {
        await roleData.create({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          permissions: formData.permissions
        });
      }
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      setError(err.message || "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title={isEditing ? "Edit Role" : "Create Role"} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title={isEditing ? "Edit Role" : "Create Role"}
        description={isEditing ? "Modify an existing system role and its permissions." : "Create a new system role."}
      />

      {error && <p className="form-error" style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {validationErrors.length > 0 && (
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem' }}>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Role Name *</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Inventory Manager"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the role's purpose"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ margin: 0, fontWeight: 'bold' }}>Assigned Permissions</label>
            <div>
              <button className="secondary-button" type="button" onClick={handleSelectAll} style={{ marginRight: '15px' }} >Select All</button>
              <button className="secondary-button" type="button" onClick={handleClearAll} style={{ marginRight: '15px' }} >Clear All</button>
            </div>
          </div>

          {availablePermissions.length === 0 ? (
            <p>No permissions found in the database.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '6px', border: '1px solid #dee2e6', }}>
              {availablePermissions.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(p.id)}
                    onChange={() => handlePermissionToggle(p.id)}
                    style={{ width: '25px', height: '25px', marginLeft: '5px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
                    <span style={{ fontWeight: p.key === '*' ? 'bold' : 'bold', marginTop: '5px' }}>
                      {p.key === '*' ? 'Full Access (*)' : p.key}
                    </span>
                    {p.description && (
                      <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                        {p.description}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button type="button" className="danger-button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : (isEditing ? "Save Changes" : "Create Role")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RoleForm;