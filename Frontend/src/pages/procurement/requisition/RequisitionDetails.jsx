import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  amendRequisition,
  approveRequisition,
  fetchRequisitionById,
  rejectRequisition,
  submitRequisition,
} from "../../../api/requisition";
import AuthContext from "../../../context/AuthContext";

import "./requisitions.css";

function RequisitionDetails() {
  const { id } = useParams();
  const { hasPermission } = useContext(AuthContext);
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // New states for Approval/Rejection UI
  const [approvedQuantities, setApprovedQuantities] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadRequisition() {
      setLoading(true);
      setError("");

      try {
        const result = await fetchRequisitionById(id);
        if (!ignore) {
          setRequisition(result);
          if (result && result.status === "Pending Approval") {
            const initialQtys = {};
            result.items.forEach(item => {
              initialQtys[item.id] = item.approvedQty ?? item.requestedQty ?? 0;
            });
            setApprovedQuantities(initialQtys);
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || "Unable to load requisition.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRequisition();

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleQtyChange = (itemId, val) => {
    setApprovedQuantities(prev => ({
      ...prev,
      [itemId]: Number(val)
    }));
  };

  async function updateStatus(action, payload = {}) {
    if (!id) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      if (action === "submit") {
        const result = await submitRequisition(id);
        setRequisition(result);
        return;
      }

      if (action === "approve") {
        const result = await approveRequisition(id, {
          comments: payload.comments || "",
          items: (requisition?.items || []).map((item) => ({
            requisitionItemId: item.id,
            approvedQty: Number(approvedQuantities[item.id] ?? item.requestedQty),
          })),
        });
        setRequisition(result);
        return;
      }

      if (action === "reject") {
        const result = await rejectRequisition(id, { comments: rejectReason });
        setRequisition(result);
        setShowRejectModal(false);
        setRejectReason("");
        return;
      }

      if (action === "amend") {
        const result = await amendRequisition(id);
        setRequisition(result);
        return;
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to update requisition status.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="requisition-page">
        <p>Loading requisition...</p>
      </div>
    );
  }

  if (error && !requisition) {
    return (
      <div className="empty-state">
        <h2>Requisition not found</h2>
        <Link to="/requisitions">Back to Requisitions</Link>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="empty-state">
        <h2>Requisition not found</h2>
        <Link to="/requisitions">Back to Requisitions</Link>
      </div>
    );
  }

  const canEdit = hasPermission("update_requisition");
  const canSubmit = hasPermission("submit_requisition") && requisition.status === "Draft";
  const canApprove = hasPermission("approve_requisition") && requisition.status === "Pending Approval";
  const canReject = hasPermission("reject_requisition") && requisition.status === "Pending Approval";
  const canAmend = hasPermission("update_requisition") && requisition.status === "Rejected";

  return (
    <div className="requisition-page">
      <div className="page-header">
        <div>
          <Link to="/requisitions" className="back-link">← Requisitions</Link>
          <h1>{requisition.requisitionNo || requisition.id}</h1>
          <p>Store Requisition Details</p>
        </div>

        <div className="page-header-actions">
          <span className={`status status-${(requisition.status || "draft").toLowerCase().replaceAll(" ", "-")}`}>
            {requisition.status}
          </span>

          {canEdit && requisition.status === "Draft" && (
            <Link to={`/requisitions/${requisition.id}/edit`} className="secondary-button">
              Edit
            </Link>
          )}
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="detail-card">
        <div className="detail-grid">
          <div>
            <span>Requester</span>
            <strong>{requisition.requester || "-"}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{requisition.department || "-"}</strong>
          </div>
          <div>
            <span>Store</span>
            <strong>{requisition.store || "-"}</strong>
          </div>
          <div>
            <span>Required Date</span>
            <strong>{requisition.requiredDate ? new Date(requisition.requiredDate).toLocaleDateString() : "-"}</strong>
          </div>
          <div>
            <span>Created Date</span>
            <strong>
              {requisition.createdDate
                ? new Date(requisition.createdDate).toLocaleDateString()
                : "-"}
            </strong>
          </div>
        </div>
      </div>

      <div className="detail-card data-table-wrapper">
        <h2>Requested Materials</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Location</th>
              <th>Requested Qty</th>
              <th>Approved Qty</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {requisition.items.map((item, index) => (
              <tr key={item.id || `${item.itemId}-${index}`}>
                <td>{item.itemName || item.itemCode || item.itemId || "-"}</td>
                <td>{item.locationName || "-"}</td>
                <td>{item.requestedQty}</td>
                <td>
                  {canApprove ? (
                    <input
                      type="number"
                      min="0"
                      max={item.requestedQty}
                      value={approvedQuantities[item.id] ?? item.requestedQty}
                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      style={{ width: "80px", padding: "4px" }}
                    />
                  ) : (
                    item.approvedQty || 0
                  )}
                </td>
                <td>{item.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="detail-card">
        <h2>Purpose</h2>
        <p>{requisition.purpose}</p>
        {requisition.remarks && (
          <>
            <h3>Notes</h3>
            <p>{requisition.remarks}</p>
          </>
        )}
      </div>

      {requisition.approvals && requisition.approvals.length > 0 && (
        <div className="detail-card data-table-wrapper">
          <h2>Approval History</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Approver</th>
                <th>Decision</th>
                <th>Comments</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {requisition.approvals.map((approval) => (
                <tr key={approval.id}>
                  <td>{approval.approver?.fullName || approval.approver?.username}</td>
                  <td>{approval.status}</td>
                  <td>{approval.comments || "-"}</td>
                  <td>{new Date(approval.decidedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canSubmit && (
        <div className="approval-panel">
          <div>
            <h2>Draft Requisition</h2>
            <p>This requisition has not yet been submitted for approval.</p>
          </div>
          <div className="approval-actions">
            <Link to={`/requisitions/${requisition.id}/edit`} className="secondary-button">
              Edit Requisition
            </Link>
            <button className="primary-button" onClick={() => updateStatus("submit")} disabled={actionLoading}>
              {actionLoading ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </div>
      )}

      {(canApprove || canReject) && (
        <div className="approval-panel">
          <div>
            <h2>Approval Decision</h2>
            <p>Review the requested materials before approving this requisition.</p>
          </div>
          <div className="approval-actions">
            {canReject && (
              <button className="danger-button" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
                Reject
              </button>
            )}
            {canApprove && (
              <button className="primary-button" onClick={() => updateStatus("approve", { comments: "Approved." })} disabled={actionLoading}>
                Approve
              </button>
            )}
          </div>
        </div>
      )}

      {canAmend && (
        <div className="approval-panel">
          <div>
            <h2>Rejected Requisition</h2>
            <p>This requisition can now be amended and resubmitted.</p>
          </div>
          <div className="approval-actions">
            <button className="primary-button" onClick={() => updateStatus("amend")} disabled={actionLoading}>
              {actionLoading ? "Resubmitting..." : "Amend & Resubmit"}
            </button>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Reject Requisition</h2>
            <p>Please provide a reason for rejecting this requisition.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows="4"
              style={{ width: "100%", margin: "10px 0", padding: "8px" }}
            />
            <div className="modal-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="secondary-button" onClick={() => setShowRejectModal(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="danger-button"
                onClick={() => updateStatus("reject")}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequisitionDetails;
