import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchIssueVouchers } from "../../api/issuing";

import "./issuing.css";

function IssueVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVouchers() {
      try {
        setLoading(true);
        const data = await fetchIssueVouchers({ page, limit: 20 });
        if (isMounted) {
          if (data.data) {
            setVouchers(data.data);
            setTotalPages(data.pagination?.totalPages || 1);
          } else {
            setVouchers([]);
            setTotalPages(1);
          }
          setError("");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load issue vouchers.");
          setVouchers([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVouchers();
    return () => { isMounted = false; };
  }, [page]);

  return (
    <div className="issuing-page">
      <div className="page-header">
        <div>
          <h1>Issue Vouchers</h1>
          <p>Model 22 store issue vouchers.</p>
        </div>
        <div>
          <Link to="/issue-vouchers/new" className="primary-button">+ New Issue Voucher</Link>
        </div>
      </div>

      {error && <div className="danger-button" style={{ display: "block", marginBottom: "20px" }}>{error}</div>}

      <div className="table-card">
        <div className="table-header"><h2>Issue Voucher Records</h2></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Voucher No.</th>
                <th>Type</th>
                <th>Department</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "30px" }}>Loading vouchers...</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "30px" }}>No issue vouchers found.</td></tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td><Link className="table-link" to={`/issue-vouchers/${voucher.id}`}>{voucher.voucherNo}</Link></td>
                    <td>{voucher.type}</td>
                    <td>{voucher.department}</td>
                    <td>{voucher.voucherDate}</td>
                    <td><span className={`status-badge ${String(voucher.status || "issued").toLowerCase().replaceAll(" ", "-")}`}>{voucher.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <Link className="table-action" to={`/issue-vouchers/${voucher.id}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-controls" style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <button
            className="secondary-button"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="secondary-button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default IssueVouchers;