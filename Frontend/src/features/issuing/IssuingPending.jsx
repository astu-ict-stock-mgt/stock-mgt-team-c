import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchIssues as listIssues } from "../../api/issuing";
import "./issuing.css";

function IssuingPending() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listIssues({ status: "PICKING", limit: 100 })
      .then((res) => {
        if (!active) return;
        const items = Array.isArray(res)
          ? res
          : res?.issues || res?.data || res?.items || [];
        setIssues(items);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load picking issues.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="issuing-page">
      <div className="page-header">
        <div>
          <Link to="/issuing" className="back-link">
            ← All Store Issues
          </Link>
          <h1>Picking In Progress</h1>
          <p>Store issues currently undergoing picking from warehouse shelves.</p>
        </div>
      </div>

      {error && <div className="form-error" style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>}

      <div className="table-card">
        {loading ? (
          <p>Loading picking store issues...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Issue No.</th>
                <th>Requisition</th>
                <th>Store</th>
                <th>Items Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {issues.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                    No store issues currently picking.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <strong>{issue.issueNo}</strong>
                    </td>
                    <td>{issue.requisitionNo || "—"}</td>
                    <td>{issue.storeName || "—"}</td>
                    <td>{issue.items?.length || 0} items</td>
                    <td>
                      <Link to={`/issuing/${issue.id}`} className="primary-button" style={{ padding: "0.25rem 0.75rem" }}>
                        Fulfill Picking
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default IssuingPending;