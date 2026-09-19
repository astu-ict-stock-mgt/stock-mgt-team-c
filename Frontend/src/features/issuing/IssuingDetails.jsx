import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchIssueById as getIssueById, completeIssue as completeIssueApi } from "../../api/issuing";
import { createIssueVoucher as createVoucherApi } from "../../api/issuing";
import "./issuing.css";

function IssuingDetails() {
  const { id } = useParams();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState("SIV");
  const [voucherRemarks, setVoucherRemarks] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await getIssueById(id);
      setIssue(data);
    } catch (err) {
      setError(err.message || "Failed to load store issue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getIssueById(id)
      .then((data) => {
        if (!active) return;
        setIssue(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load store issue.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function handleCompleteIssue() {
    const confirmMessage = "WARNING: This action will permanently reduce inventory quantities and post the transaction to the stock ledger. Are you sure you want to proceed?";
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      await completeIssueApi(id);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to complete store issue.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateVoucher() {
    setActionLoading(true);
    setError("");
    try {
      await createVoucherApi({
        storeIssueId: issue.id,
        type: voucherType,
        remarks: voucherRemarks ? voucherRemarks.trim() : null,
      });
      setShowVoucherModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create issue voucher.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="issuing-page">
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (error && !issue) {
    return (
      <div className="issuing-page">
        <div className="empty-state">
          <h2>Store issue not found</h2>
          <p>{error}</p>
          <Link to="/issuing" className="primary-button">
            Back to Issuing
          </Link>
        </div>
      </div>
    );
  }

  const status = issue?.status?.toUpperCase() || "";

  return (
    <div className="issuing-page">
      <div className="page-header">
        <div>
          <Link to="/issuing" className="back-link">
            ← Back to Store Issues
          </Link>
          <h1>{issue.issueNo}</h1>
          <p>Store Issue Fulfillment & Picking Details</p>
        </div>

        <div className="page-header-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>

          {["PICKING", "ISSUED"].includes(status) && (
            <button
              type="button"
              className="primary-button"
              onClick={handleCompleteIssue}
              disabled={actionLoading}
              style={{ background: "#10b981" }}
            >
              {actionLoading ? "Posting Inventory..." : "Complete Issue & Post Stock OUT"}
            </button>
          )}

          {status === "COMPLETED" && (
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowVoucherModal(true)}
              disabled={actionLoading}
            >
              + Generate Voucher (SIV / ISIV)
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error" style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>}

      <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        <div className="card">
          <h2>Issue Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <strong>Requisition:</strong>
              <p>
                {issue.requisitionId ? (
                  <Link to={`/requisitions/${issue.requisitionId}`}>{issue.requisitionNo}</Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <strong>Store:</strong>
              <p>{issue.storeName}</p>
            </div>
            <div>
              <strong>Issued By:</strong>
              <p>{issue.metadata?.issuedBy?.fullName || issue.metadata?.issuedBy?.username || "—"}</p>
            </div>
            <div>
              <strong>Issue Date:</strong>
              <p>{new Date(issue.metadata?.createdAt || issue.issueDate).toLocaleString()}</p>
            </div>
            {issue.remarks && (
              <div style={{ gridColumn: "span 2" }}>
                <strong>Remarks:</strong>
                <p>{issue.remarks}</p>
              </div>
            )}
          </div>

          <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Picked & Issued Items</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Location</th>
                <th>Requested</th>
                <th>Approved</th>
                <th>Issued Quantity</th>
              </tr>
            </thead>
            <tbody>
              {issue.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.itemCode}</strong> - {item.itemName}
                  </td>
                  <td>{item.locationName || "Default Bin"}</td>
                  <td>{Number(item.requestedQty || 0)}</td>
                  <td>{Number(item.approvedQty || 0)}</td>
                  <td>
                    <strong style={{ color: "#10b981" }}>{Number(item.issuedQty)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Issue Vouchers</h2>
          <div style={{ marginTop: "1rem" }}>
            {issue.metadata?.vouchers?.length === 0 || !issue.metadata?.vouchers ? (
              <p style={{ color: "var(--color-text-secondary, #64748b)" }}>
                No voucher generated yet. Complete the issue to generate an official SIV / ISIV.
              </p>
            ) : (
              issue.metadata?.vouchers?.map((v) => (
                <div
                  key={v.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid var(--color-border, #e2e8f0)",
                    borderRadius: "6px",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{v.voucherNo}</strong>
                    <span className="status-badge badge-info">{v.type}</span>
                  </div>
                  <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                    Date: {new Date(v.voucherDate || v.createdAt).toLocaleDateString()}
                  </p>
                  {v.remarks && <p style={{ fontSize: "0.85rem", color: "#64748b" }}>{v.remarks}</p>}
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <Link to={`/gate-passes?voucherId=${v.id}`} className="secondary-button" style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}>
                      Create Gate Pass →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showVoucherModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-card" style={{ background: "#ffffff", padding: "2rem", borderRadius: "8px", maxWidth: "500px", width: "90%" }}>
            <h2>Generate Issue Voucher</h2>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Voucher Type *</label>
              <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)}>
                <option value="SIV">SIV (Store Issue Voucher)</option>
                <option value="ISIV">ISIV (Inter-Store Issue Voucher)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Remarks</label>
              <textarea
                rows={3}
                value={voucherRemarks}
                onChange={(e) => setVoucherRemarks(e.target.value)}
                placeholder="Optional remarks on this voucher"
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowVoucherModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleCreateVoucher}
                disabled={actionLoading}
              >
                {actionLoading ? "Generating..." : "Generate Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IssuingDetails;