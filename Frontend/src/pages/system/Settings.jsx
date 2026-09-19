import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../api/client";

function Settings() {
  const { user, updateUser } = useAuth();

  const [compactMode, setCompactMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user && user.preferences) {
      let prefs = user.preferences;
      if (typeof prefs === "string") {
        try {
          prefs = JSON.parse(prefs);
        } catch (e) {
          prefs = {};
        }
      }
      if (prefs.compactMode !== undefined) {
        setCompactMode(prefs.compactMode);
      }
    }
  }, [user]);



  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const preferences = {
        ...(typeof user.preferences === 'object' ? user.preferences : {}),
        compactMode
      };

      const response = await apiRequest("/auth/me", {
        method: "PATCH",
        body: { preferences }
      });

      const updatedUser = response.data?.user || response.user || response.data;
      if (updatedUser) {
        updateUser(updatedUser);
        setSuccess("Settings saved successfully.");
      }
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Personal Preferences</h1>
          <p>Configure your personal preferences.</p>
        </div>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-danger" style={{ color: "red", marginBottom: "15px" }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ color: "green", marginBottom: "15px" }}>{success}</div>}



        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", width: "auto" }}>
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={compactMode}
              onChange={(event) => {
                setCompactMode(event.target.checked);
                setSuccess("");
              }}
            />
            Compact interface
          </label>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={loading}
          style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

export default Settings;