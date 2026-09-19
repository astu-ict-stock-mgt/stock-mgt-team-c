import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import userData from "./userData";

function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    department: "",
    status: "Active",
    password: "",
    roles: [],
  });

  const [availableRoles, setAvailableRoles] = useState([]);
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
        const roles = await userData.getRoles();
        if (isMounted) setAvailableRoles(roles);

        if (isEditing) {
          const user = await userData.getById(id);
          if (isMounted && user) {
            setFormData({
              name: user.fullName || user.name || "",
              username: user.username || "",
              email: user.email || "",
              phone: user.phone || "",
              department: user.department || "",
              status: user.isActive ? "Active" : "Inactive",
              password: "",
              roles: Array.isArray(user.roles) ? user.roles.map(r => r.role?.name || r.name || r) : [],
            });
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
  }, [id, isEditing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleName) => {
    setFormData((prev) => {
      const roles = prev.roles.includes(roleName)
        ? prev.roles.filter(r => r !== roleName)
        : [...prev.roles, roleName];
      return { ...prev, roles };
    });
  };

  const validate = () => {
    const errs = [];
    if (!formData.name.trim() || formData.name.length < 2) errs.push("Full Name must be at least 2 characters.");
    if (!formData.username.trim() || formData.username.length < 3) errs.push("Username must be at least 3 characters.");
    if (!isEditing && (!formData.password || formData.password.length < 8)) errs.push("Password must be at least 8 characters.");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.push("Invalid email format.");
    if (formData.roles.length === 0) errs.push("At least one role must be selected.");
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
        await userData.update(id, {
          fullName: formData.name,
          username: formData.username,
          email: formData.email || undefined,
          phone: formData.phone,
          department: formData.department,
          isActive: formData.status === "Active"
        });
        await userData.assignRoles(id, { roleNames: formData.roles });
      } else {
        await userData.create({
          fullName: formData.name,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          password: formData.password,
          roleNames: formData.roles
        });
      }
      navigate("/users");
    } catch (err) {
      setError(err.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="master-page"><PageHeader title={isEditing ? "Edit User" : "Create User"} /><p>Loading form...</p></div>;
  }

  return (
    <div className="master-page">
      <PageHeader
        title={isEditing ? "Edit User" : "Create User"}
        description={isEditing ? "Update system user information." : "Add a new user to the system."}
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
            <label>Full Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required />
          </div>

          <div className="form-group">
            <label>Username *</label>
            <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email address" required={!isEditing} />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" />
          </div>

          <div className="form-group">
            <label>Department</label>
            <input name="department" value={formData.department} onChange={handleChange} placeholder="Department" />
          </div>

          {!isEditing && (
            <div className="form-group">
              <label>Password *</label>
              <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Secure password" required />
            </div>
          )}

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Roles *</label>
          {availableRoles.length === 0 ? (
            <p>No roles available. Please check backend API.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              {availableRoles.map(r => (
                <label key={r.id || r.name} style={{ display: 'flex', width: '7.6rem', height: '7.6rem', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(r.name)}
                    onChange={() => handleRoleToggle(r.name)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button type="button" className="danger-button" onClick={() => navigate("/users")} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : (isEditing ? "Save Changes" : "Create User")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserForm;