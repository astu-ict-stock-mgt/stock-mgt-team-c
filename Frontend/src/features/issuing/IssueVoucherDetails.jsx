import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchIssueVoucherById } from "../../api/issuing";

import "./issuing.css";

function IssueVoucherDetails() {
  const { id } = useParams();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVoucher() {
      try {
        setLoading(true);
        const data = await fetchIssueVoucherById(id);
        if (isMounted) {
          setVoucher(data);
          setError("");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load issue voucher.");
          setVoucher(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVoucher();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="issuing-page">
        <div className="page-header">
          <div><h1>Loading voucher...</h1></div>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="issuing-page">
        <div className="page-header">
          <div>
            <h1>Voucher Not Found</h1>
            <p>{error || "The requested issue voucher could not be found."}</p>
          </div>
        </div>
        <Link to="/issue-vouchers" className="secondary-button">← Back to Issue Vouchers</Link>
      </div>
    );
  }

  return (
    <div className="issuing-page">
      <div className="voucher-toolbar">
        <Link to="/issue-vouchers" className="back-link">← Issue Vouchers</Link>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="primary-button" onClick={() => window.print()}>Print Model 22</button>
        </div>
      </div>

      <div className="voucher-document">
        <div className="voucher-header">
          <div>
            <h1>STORE ISSUE VOUCHER</h1>
            <p>MODEL 22</p>
          </div>
          <div className="voucher-number">
            <strong>{voucher.voucherNo}</strong>
            <span>{voucher.voucherDate}</span>
          </div>
        </div>

        <div className="voucher-info">
          <div><span>Issue No.</span><strong>{voucher.issueNo}</strong></div>
          <div><span>Issue Type</span><strong>{voucher.type}</strong></div>
          <div><span>Issued To</span><strong>{voucher.issuedToUser?.fullName || voucher.issuedToUser?.username || "—"}</strong></div>
          <div><span>Store</span><strong>{voucher.storeName || "—"}</strong></div>
          <div><span>Department</span><strong>{voucher.department || "—"}</strong></div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <span className={`status-badge ${String(voucher.status || "issued").toLowerCase().replaceAll(" ", "-")}`}>{voucher.status}</span>
        </div>

        <table className="voucher-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Item Code</th>
              <th>Item Description</th>
              <th>Unit</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {voucher.items && voucher.items.length ? (
              voucher.items.map((item, index) => (
                <tr key={item.id || `${item.itemCode}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{item.itemCode}</td>
                  <td>{item.itemName}</td>
                  <td>{item.unit}</td>
                  <td>{item.issuedQty}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No items were attached to this voucher.</td></tr>
            )}
          </tbody>
        </table>

        <div className="voucher-notes">
          <strong>Remarks:</strong>
          <p>{voucher.remarks || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export default IssueVoucherDetails;