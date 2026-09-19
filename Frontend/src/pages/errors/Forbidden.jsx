import { Link } from "react-router-dom";

function Forbidden() {
  return (
    <div className="not-found-page">
      <h1>403</h1>

      <h2>Access Denied</h2>

      <p>
        You do not have permission to access
        this page.
      </p>

      <Link to="/dashboard">
        Return to Dashboard
      </Link>
    </div>
  );
}

export default Forbidden;