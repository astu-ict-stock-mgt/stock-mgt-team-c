import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../api/client";

function Profile() {
  const { user, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        phone: user.phone || ""
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest("/auth/me", {
        method: "PATCH",
        body: formData
      });
      
      const updatedUser = response.data?.user || response.user || response.data;
      if (updatedUser) {
        updateUser(updatedUser);
        setSuccess("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and edit your account information.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ color: "red", marginBottom: "15px" }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ color: "green", marginBottom: "15px" }}>{success}</div>}

      <div className="detail-grid">
        <div className="detail-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Account</h2>
            {!isEditing && (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label htmlFor="profile-fullName">Full Name</label>
                <input
                  id="profile-fullName"
                  type="text"
                  name="fullName"
                  className="form-control"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  minLength={2}
                  maxLength={150}
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  type="text"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={30}
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label htmlFor="profile-username">Username (Read Only)</label>
                <input id="profile-username" type="text" className="form-control" value={user?.username} disabled style={{ width: "100%", padding: "8px", marginTop: "5px", backgroundColor: "#f5f5f5" }} />
              </div>
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label htmlFor="profile-email">Email (Read Only)</label>
                <input id="profile-email" type="email" className="form-control" value={user?.email} disabled style={{ width: "100%", padding: "8px", marginTop: "5px", backgroundColor: "#f5f5f5" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      fullName: user.fullName || "",
                      phone: user.phone || ""
                    });
                    setError("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="detail-list">
              <div>
                <span>Full Name</span>
                <strong>{user?.fullName}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{user?.phone || "Not provided"}</strong>
              </div>
              <div>
                <span>Username</span>
                <strong>{user?.username}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user?.email}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{user?.role}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{user?.department || "None"}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h2>Permissions</h2>
          <div className="permission-list">
            {user?.permissions?.map((permission) => (
              <span key={permission} style={{ display: "inline-block", background: "#eee", padding: "4px 8px", borderRadius: "4px", margin: "4px", fontSize: "14px" }}>
                {permission}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;