import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import userData from "./userData";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function fetchUser() {
      setLoading(true);
      try {
        const data = await userData.getById(id);
        if (isMounted) {
          if (!data) {
            setError("User not found.");
          } else {
            setUser(data);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load user details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchUser();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="User Details" />
        <p>Loading user details...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="master-page">
        <PageHeader title="User Details" />
        <p className="form-error" style={{ color: 'red' }}>{error || "User not found."}</p>
        <button className="secondary-button" onClick={() => navigate("/users")}>Back to Users</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <PageHeader
          title={user.fullName || user.username}
          description="Detailed user information and access rights."
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="secondary-button" onClick={() => navigate("/users")}>
            Back
          </button>
          <button className="primary-button" onClick={() => navigate(`/users/${id}/edit`)}>
            Edit User
          </button>
        </div>
      </div>

      <div className="details-grid">
        <div className="details-card">
          <h3>Profile</h3>
          <div className="detail-row">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">{user.fullName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Username</span>
            <span className="detail-value">{user.username}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user.email || "N/A"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{user.phone || "N/A"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Department</span>
            <span className="detail-value">{user.department || "N/A"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created At</span>
            <span className="detail-value">{new Date(user.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="details-card">
          <h3>Roles & Access</h3>
          <div className="detail-row">
            <span className="detail-label">Roles</span>
            <span className="detail-value">
              {user.roles && user.roles.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {user.roles.map((r, i) => (
                    <span key={i} style={{ background: '#e9ecef', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                      {r.role?.name || r.name || r}
                    </span>
                  ))}
                </div>
              ) : (
                "None"
              )}
            </span>
          </div>
          
          <div className="detail-row" style={{ marginTop: '1rem' }}>
            <span className="detail-label">Permissions</span>
            <span className="detail-value">
              {user.permissions && user.permissions.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#666' }}>
                  {user.permissions.map((p, i) => (
                    <li key={i}>{p.key || p}</li>
                  ))}
                </ul>
              ) : (
                "No specific permissions"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetails;