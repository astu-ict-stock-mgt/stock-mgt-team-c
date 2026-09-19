import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReturns } from "../../api/returns";
import "./returns.css";

function Returns() {
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { records, pagination } = await fetchReturns({ page, limit: 10, search, status });
        if (!mounted) return;
        setReturns(Array.isArray(records) ? records : []);
        setTotalPages(pagination.totalPages || 1);
      } catch (err) {
        console.error("Unable to load returns:", err);
        if (mounted) {
          setReturns([]);
          setError(err?.message || "Failed to load returns");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [page, search, status]);

  function getStatusClass(currentStatus) {
    if (!currentStatus) return "status-draft";
    return `status status-${currentStatus.toLowerCase().replaceAll(" ", "-")}`;
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>Material Returns</h1>
          <p>Manage materials returned to the store and their inspection status.</p>
        </div>
        <Link to="/returns/new" className="primary-button">
          + New Return
        </Link>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search return number, item or department..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All Statuses</option>
          <option value="RETURN_REQUEST">Pending Receive</option>
          <option value="RECEIVED">Pending Inspection</option>
          <option value="INSPECTED">Inspected</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Return Notes</h2>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">Loading returns...</div>
          ) : error ? (
            <div className="empty-state error-message">{error}</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>SRN</th>
                    <th>Requester</th>
                    <th>Department</th>
                    <th>Items</th>
                    <th>Return Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan="7">No return records found.</td>
                    </tr>
                  ) : (
                    returns.map((returnItem) => (
                      <tr key={returnItem.id}>
                        <td><strong>{returnItem.returnNumber || returnItem.id.split("-")[0]}</strong></td>
                        <td>{returnItem.requester?.fullName || returnItem.requester || "-"}</td>
                        <td>{returnItem.department?.name || returnItem.departmentId || "-"}</td>
                        <td>{returnItem.items?.length || 0}</td>
                        <td>{returnItem.returnDate}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(returnItem.displayStatus)}`}>
                            {returnItem.displayStatus}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            <Link className="table-action" to={`/returns/${returnItem.id}`}>
                              View
                            </Link>
                            {returnItem.status === "RECEIVED" && (
                              <Link className="table-action" to={`/returns/${returnItem.id}/inspect`}>
                                Inspect
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pagination-controls" style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button 
                  className="secondary-button" 
                  disabled={page <= 1} 
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button 
                  className="secondary-button" 
                  disabled={page >= totalPages} 
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Returns;