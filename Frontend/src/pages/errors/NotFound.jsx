import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="system-page">
      <h1>404</h1>

      <h2>Page Not Found</h2>

      <button
        onClick={() =>
          navigate("/dashboard")
        }
      >
        Return to Dashboard
      </button>
    </div>
  );
}

export default NotFound;