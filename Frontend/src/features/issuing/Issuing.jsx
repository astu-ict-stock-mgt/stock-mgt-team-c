import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchIssues } from "../../api/issuing";
import "./issuing.css";

function Issuing() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on status change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadIssues() {
      try {
        setLoading(true);
        const { data, pagination: serverPagination } = await fetchIssues({ 
          search: debouncedSearch, 
          status: statusFilter,
          page,
          limit 
        });
        
        if (isMounted) {
          setIssues(data);
          setPagination(serverPagination);
          setError("");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load store issues.");
          setIssues([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadIssues();
    return () => { isMounted = false; };
  }, [debouncedSearch, statusFilter, page, limit]);

  function getStatusClass(status) {
    return String(status || "").toLowerCase().replaceAll(" ", "-");
  }

  const total = pagination?.total || 0;
  
  return (
    <div className="issuing-page">
      <div className="page-header">
        <div>
          <h1>Store Issuing</h1>
          <p>Manage approved requisitions and store issue vouchers.</p>
        </div>
        <Link to="/issuing/new" className="primary-button">+ Create Issue</Link>
      </div>

      <div className="summary-grid">
        <div className="summary-card"><span>Total Issues</span><strong>{total}</strong></div>
      </div>

      <div className="module-actions">
        <Link to="/issuing">All Issues</Link>
        <Link to="/issue-vouchers">Issue Vouchers</Link>
      </div>

      <div className="control-panel">
        <input 
          type="text" 
          placeholder="Search issue no, requisition no, department, store..." 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Statuses</option>
          <option>Picking</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      {error && <div className="danger-button" style={{ display: "block", marginBottom: "20px" }}>{error}</div>}

      <div className="master-result-summary">
        <span>Showing <strong>{issues.length}</strong> of <strong>{total}</strong> issues</span>
      </div>

      <div className="table-card">
        <div className="table-header"><h2>Recent Issues</h2></div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Issue No.</th>
                <th>Requisition</th>
                <th>Department</th>
                <th>Store</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>Loading issues...</td></tr>
              ) : issues.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>No issues found.</td></tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td><Link className="table-link" to={`/issuing/${issue.id}`}>{issue.issueNo}</Link></td>
                    <td>{issue.requisitionNo}</td>
                    <td>{issue.department}</td>
                    <td>{issue.storeName}</td>
                    <td><span className={`status-badge ${getStatusClass(issue.status)}`}>{issue.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <Link className="table-action" to={`/issuing/${issue.id}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderTop: "1px solid #e5e7eb" }}>
            <button 
              className="secondary-button" 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button 
              className="secondary-button" 
              disabled={page === pagination.totalPages} 
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Issuing;