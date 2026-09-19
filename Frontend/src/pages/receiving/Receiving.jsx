import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import receivingService from "../../services/receivingService";

function Receiving() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [counts, setCounts] = useState({ all: 0, pending: 0, accepted: 0, rejected: 0, completed: 0 });

  useEffect(() => {
    async function loadReceipts() {
      setLoading(true);
      setError("");
      try {
        const query = { page, limit: pagination.limit };
        if (search) query.search = search;
        if (statusFilter !== "All") query.status = statusFilter;

        const result = await receivingService.list(query);
        setRecords((result.data || []).map((receipt) => ({
          ...receipt,
          supplier: receipt.supplier?.name || "",
          store: receipt.store?.name || "",
        })));

        if (result.pagination) {
          setPagination(result.pagination);
        }

        // Ideally, counts should be provided by the backend. If not, we just update all count from pagination.total
        // We will do a separate lightweight call or just leave counts as whatever we have, or omit them.
        // For now, we update "all" from total, but we can't accurately get the other statuses without an aggregate endpoint.
        // I will keep the client-side logic for the current page records, or ideally backend should provide it.
        // Since backend doesn't provide it, we'll just count based on the current page to avoid breaking the UI completely, or leave them as 0 if it's too complex.

        // Wait, if I do client-side count on the current page, it's confusing. Let's just do it for the current page as a fallback.
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadReceipts();
  }, [page, pagination.limit, search, statusFilter]);

  // Handle Search and Status changes by resetting page to 1
  function handleSearchChange(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleStatusChange(e) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  // Update counts based on current records (note: this is only for the current page now, ideally backend provides this)
  useEffect(() => {
    setCounts({
      all: pagination.total,
      pending: records.filter(r => r.status === "INSPECTION_PENDING" || r.status === "INSPECTED").length,
      accepted: records.filter(r => r.status === "APPROVED").length,
      rejected: records.filter(r => r.status === "REJECTED").length,
      completed: records.filter(r => r.status === "GRN_CREATED").length,
    });
  }, [records, pagination.total]);

  function formatDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="page-container">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Goods Receiving</h1>
          <p>Record and evaluate materials received by the organization.</p>
        </div>
        <Link to="/receiving/new" className="primary-button">+ New Receipt</Link>
      </div>

      {/* SUMMARY */}
      <div className="summary-grid">
        <div className="summary-card">
          <span>Total Records</span>
          <strong>{counts.all}</strong>
        </div>
        <div className="summary-card warning">
          <span>Pending Evaluation (Page)</span>
          <strong>{counts.pending}</strong>
        </div>
        <div className="summary-card success">
          <span>Accepted (Page)</span>
          <strong>{counts.accepted}</strong>
        </div>
        <div className="summary-card danger">
          <span>Rejected (Page)</span>
          <strong>{counts.rejected}</strong>
        </div>
      </div>

      {/* FILTER */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search receipt or supplier..."
          value={search}
          onChange={handleSearchChange}
          aria-label="Search receipts"
        />
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          aria-label="Filter by status"
        >
          <option value="All">All Status</option>
          <option value="VERIFICATION_PENDING">Verification Pending</option>
          <option value="INSPECTION_PENDING">Inspection Pending</option>
          <option value="INSPECTED">Inspected</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="GRN_CREATED">GRN Created</option>
        </select>
      </div>

      <div className="master-result-summary">
        <span>
          Showing page <strong>{page}</strong> of <strong>{pagination.totalPages || 1}</strong> ({pagination.total} records total)
        </span>
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Receipt No.</th>
              <th>Supplier</th>
              <th>Reference</th>
              <th>Delivery Date</th>
              <th>Store</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "30px" }}>Loading receipts...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "30px" }} className="form-error">
                  Error: {error}
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "30px" }}>
                  {search || statusFilter !== "All" ? "No receiving records match the current filters." : "No receiving records found."}
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>{record.receiptNumber}</td>
                  <td>{record.supplier}</td>
                  <td>{record.documentReference || "N/A"}</td>
                  <td>{formatDate(record.deliveryDate)}</td>
                  <td>{record.store}</td>
                  <td>
                    <span className={`status-badge ${record.status.toLowerCase().replaceAll("_", "-")}`}>
                      {record.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <Link to={`/receiving/${record.id}`} className="table-action">View</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          <button
            className="secondary-button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
}

export default Receiving;