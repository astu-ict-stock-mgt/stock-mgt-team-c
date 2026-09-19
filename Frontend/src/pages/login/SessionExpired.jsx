import { useNavigate } from "react-router-dom";

function SessionExpired() {
  const navigate = useNavigate();

  return (
    <div className="system-page">
      <h1>Session Expired</h1>

      <p>
        Please sign in again.
      </p>

      <button
        onClick={() =>
          navigate("/auth/login")
        }
      >
        Sign In
      </button>
    </div>
  );
}

export default SessionExpired;