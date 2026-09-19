import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/apiClient";
import "./login.css";

function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setResetToken("");

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Please enter your username.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", {
        username: cleanUsername,
      });

      setMessage(
        response?.message ||
          "If the account exists, password reset instructions have been generated."
      );
      if (response?.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch (err) {
      setError(err.message || "Failed to submit password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">MS</div>
          <h1>Forgot Password</h1>
          <p>Enter your username to request password recovery.</p>
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && (
          <div className="login-success" style={{ color: "#10b981", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {message}
            {resetToken && (
              <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px" }}>
                <strong>Development Reset Token:</strong>
                <p style={{ wordBreak: "break-all", fontFamily: "monospace", margin: "0.25rem 0" }}>{resetToken}</p>
                <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`} style={{ textDecoration: "underline", fontWeight: "bold" }}>
                  Proceed to Reset Password
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              disabled={loading}
              autoFocus
            />
          </div>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Requesting..." : "Request Reset"}
          </button>
        </form>

        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;