import { Link } from "react-router-dom";

function SessionExpired() {
  return (
    <div className="not-found-page">
      <h1>Session</h1>

      <h2>Session Expired</h2>

      <p>
        Your session has expired.
        Please sign in again.
      </p>

      <Link to="/login">
        Sign In
      </Link>
    </div>
  );
}

export default SessionExpired;