import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStockTakings } from "../../api/stockTaking";
import "./control.css";

function StockTaking() {
  const [stockTakings, setStockTakings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStockTakings();
        if (mounted) setStockTakings(data);
      } catch (err) {
        console.error("Unable to load stock takings:", err);
        if (mounted) setError(err.message || "Failed to load stock takings.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);
  return (
    <div className="control-page">

      <div className="page-header">

        <div>
          <h1>Stock Taking</h1>
          <p>
            Conduct physical stock counts and reconcile
            inventory discrepancies.
          </p>
        </div>

        <Link
          to="/stock-taking/new"
          className="primary-button"
        >
          + New Stock Taking
        </Link>

      </div>

      <div className="monitor-summary">

        <div className="monitor-card">
          <span>Total Sessions</span>
          <strong>{stockTakings.length}</strong>
        </div>

        <div className="monitor-card warning">
          <span>Reconciliation</span>
          <strong>
            {
              stockTakings.filter(
                (session) =>
                  session.status === "INVESTIGATING" || session.status === "PENDING_APPROVAL"
              ).length
            }
          </strong>
        </div>

        <div className="monitor-card">
          <span>Completed</span>
          <strong>
            {
              stockTakings.filter(
                (session) =>
                  session.status === "COMPLETED"
              ).length
            }
          </strong>
        </div>

      </div>

      <div className="table-card">
        {error ? (
          <div className="form-error" role="alert" style={{ margin: "20px", color: "red", backgroundColor: "#ffe6e6", padding: "15px", borderRadius: "4px" }}>
            {error}
            <button onClick={() => window.location.reload()} style={{ marginLeft: "15px", padding: "5px 10px", cursor: "pointer", borderRadius: "4px", border: "1px solid #ccc" }}>Retry</button>
          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Session</th>
                <th>Store</th>
                <th>Auditor</th>
                <th>Date</th>
                <th>Unique Items</th>
                <th>Counted</th>
                <th>Discrepancies</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                    Loading stock taking sessions...
                  </td>
                </tr>
              ) : stockTakings.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                    No stock taking sessions found.
                  </td>
                </tr>
              ) : (
                stockTakings.map((session) => (
                  <tr key={session.id}>

                    <td>
                      <strong>{session.sessionNumber}</strong>
                    </td>

                    <td>{session.store?.name || "All Locations"}</td>

                    <td>{session.startedBy?.fullName || "-"}</td>

                    <td>{new Date(session.startedAt).toLocaleDateString()}</td>

                    <td>{new Set(session.counts?.map(c => c.itemId)).size || 0}</td>

                    <td>{session.counts?.length || 0}</td>

                    <td>{session.discrepancies?.length || 0}</td>

                    <td>
                      <span className="status-badge">
                        {session.status}
                      </span>
                    </td>

                    <td>
                      <Link
                        to={`/stock-taking/${session.id}`}
                        className="table-action"
                      >
                        View
                      </Link>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

      </div>

    </div >
  );
}

export default StockTaking;