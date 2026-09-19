import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchDisposalById, inspectDisposal, approveDisposal, rejectDisposal, completeDisposal } from "../../api/disposal";
import "./control.css";

function DisposalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [disposal, setDisposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  // Inspection form
  const [inspectionResult, setInspectionResult] = useState("");
  const [approvedForDisposal, setApprovedForDisposal] = useState("true"); // string for radio button

  // Approval form
  const [approvalRemarks, setApprovalRemarks] = useState("");

  // Completion form
  const [disposalMethod, setDisposalMethod] = useState("Scrap");
  const [completionRemarks, setCompletionRemarks] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchDisposalById(id);
      setDisposal(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load disposal details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="control-page"><div className="empty-state">Loading disposal request...</div></div>;
  }

  if (!disposal) {
    return (
      <div className="control-page">
        <div className="empty-state">
          <h2>Disposal request not found</h2>
          <p>{error}</p>
          <Link to="/disposal" className="back-link">
            &larr; Back to Disposal Requests
          </Link>
        </div>
      </div>
    );
  }

  const handleAction = async (actionFn, actionName, payload = {}) => {
    try {
      setActionLoading(true);
      setActionError("");
      await actionFn(id, payload);
      await loadData();
    } catch (err) {
      setActionError(`Failed to ${actionName}: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const status = disposal.status;

  function getStatusClass(value) {
    if (!value) return "status-draft";
    return `status-${value.toLowerCase().replaceAll(" ", "-")}`;
  }

  return (
    <div className="control-page">
      <div className="page-header">
        <div>
          <button type="button" className="back-link" onClick={() => navigate("/disposal")}>
            &larr; Disposal Requests
          </button>
          <h1>Disposal Request: {disposal.requestNumber || disposal.id.split("-")[0]}</h1>
          <p>Disposal request workflow and details.</p>
        </div>
        <div className="page-header-actions">
           <span className={`status-badge ${getStatusClass(status)}`}>
              {status}
           </span>
        </div>
      </div>

      {actionError && (
        <div className="form-error" style={{ marginBottom: "20px" }}>
          {actionError}
        </div>
      )}

      <div className="workflow">
        <span className={status !== "REQUESTED" ? "completed" : "active"}>
          Requested
        </span>
        <span className={["INSPECTED", "APPROVED", "COMPLETED", "REJECTED"].includes(status) ? "completed" : status === "REQUESTED" ? "" : "active"}>
          Inspection
        </span>
        <span className={["APPROVED", "COMPLETED"].includes(status) ? "completed" : status === "INSPECTED" ? "active" : ""}>
          Approval
        </span>
        <span className={status === "COMPLETED" ? "completed" : status === "APPROVED" ? "active" : ""}>
          Completion
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h2>Material Information</h2>
          <div className="detail-row">
            <span>Item</span>
            <strong>{disposal.item?.name || disposal.itemId}</strong>
          </div>
          <div className="detail-row">
            <span>Item Code</span>
            <strong>{disposal.item?.code || "-"}</strong>
          </div>
          <div className="detail-row">
            <span>Quantity</span>
            <strong>{disposal.quantity}</strong>
          </div>
          <div className="detail-row">
            <span>Location</span>
            <strong>{disposal.location?.code || disposal.locationId}</strong>
          </div>
          <div className="detail-row" style={{ gridColumn: "1 / -1" }}>
            <span>Reason</span>
            <strong>{disposal.reason}</strong>
          </div>
        </div>

        <div className="detail-card">
          <h2>Workflow Information</h2>
          <div className="detail-row">
            <span>Requested By</span>
            <strong>{disposal.requestedBy?.fullName || disposal.requestedBy?.username || disposal.requestedById}</strong>
          </div>
          <div className="detail-row">
            <span>Request Date</span>
            <strong>{disposal.requestedAt ? new Date(disposal.requestedAt).toLocaleString() : "-"}</strong>
          </div>
          {disposal.inspectedAt && (
            <>
              <div className="detail-row">
                <span>Inspected By</span>
                <strong>{disposal.inspectedBy?.fullName || disposal.inspectedBy?.username || disposal.inspectedById}</strong>
              </div>
              <div className="detail-row">
                <span>Inspection Date</span>
                <strong>{new Date(disposal.inspectedAt).toLocaleString()}</strong>
              </div>
              <div className="detail-row" style={{ gridColumn: "1 / -1" }}>
                <span>Inspection Result</span>
                <strong>{disposal.inspectionResult}</strong>
              </div>
            </>
          )}
          {disposal.approvedAt && (
            <>
              <div className="detail-row">
                <span>{disposal.approval?.approved === false ? "Rejected By" : "Approved By"}</span>
                <strong>{disposal.approvedBy?.fullName || disposal.approvedBy?.username || disposal.approvedById}</strong>
              </div>
              <div className="detail-row">
                <span>Date</span>
                <strong>{new Date(disposal.approvedAt).toLocaleString()}</strong>
              </div>
              {disposal.approval?.remarks && (
                <div className="detail-row" style={{ gridColumn: "1 / -1" }}>
                  <span>Remarks</span>
                  <strong>{disposal.approval.remarks}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {status === "REQUESTED" && (
        <div className="action-panel" style={{ marginTop: "2rem" }}>
          <h3>Workflow Actions: Inspection</h3>
          <p>Inspect the material and determine if it meets the criteria for disposal.</p>
          
          <div className="form-group full-width" style={{ marginTop: "1rem" }}>
            <label>Inspection Result / Findings</label>
            <textarea 
              rows="3"
              value={inspectionResult}
              onChange={(e) => setInspectionResult(e.target.value)}
              placeholder="Describe the condition of the material..."
            />
          </div>

          <div className="form-group full-width">
            <label>Approved for Disposal?</label>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "normal" }}>
                <input 
                  type="radio" 
                  name="approvedForDisposal" 
                  value="true" 
                  checked={approvedForDisposal === "true"} 
                  onChange={(e) => setApprovedForDisposal(e.target.value)} 
                />
                Yes, recommend for disposal
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "normal" }}>
                <input 
                  type="radio" 
                  name="approvedForDisposal" 
                  value="false" 
                  checked={approvedForDisposal === "false"} 
                  onChange={(e) => setApprovedForDisposal(e.target.value)} 
                />
                No, reject disposal request
              </label>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button
              className="primary-button"
              onClick={() => {
                if (!inspectionResult) {
                  setActionError("Please provide inspection results.");
                  return;
                }
                handleAction(inspectDisposal, "inspect", { result: inspectionResult, approvedForDisposal: approvedForDisposal === "true" });
              }}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Complete Inspection"}
            </button>
          </div>
        </div>
      )}

      {status === "INSPECTED" && (
        <div className="action-panel" style={{ marginTop: "2rem" }}>
          <h3>Workflow Actions: Approval</h3>
          <p>Review the inspection result and approve or reject the disposal request.</p>

          <div className="form-group full-width" style={{ marginTop: "1rem" }}>
            <label>Remarks (Required for rejection)</label>
            <textarea 
              rows="2"
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Add any remarks..."
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              className="primary-button"
              onClick={() => handleAction(approveDisposal, "approve", { remarks: approvalRemarks })}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Approve Disposal"}
            </button>
            <button
              className="danger-button"
              onClick={() => {
                if (!approvalRemarks) {
                  setActionError("Please provide remarks for rejection.");
                  return;
                }
                handleAction(rejectDisposal, "reject", { remarks: approvalRemarks });
              }}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Reject Request"}
            </button>
          </div>
        </div>
      )}

      {status === "APPROVED" && (
        <div className="action-panel" style={{ marginTop: "2rem" }}>
          <h3>Workflow Actions: Completion</h3>
          <p>Disposal has been approved. Complete the disposal operation to permanently remove the item from inventory.</p>
          
          <div className="form-grid" style={{ marginTop: "1rem" }}>
            <div className="form-group">
              <label>Disposal Method</label>
              <select value={disposalMethod} onChange={(e) => setDisposalMethod(e.target.value)}>
                <option value="Scrap">Scrap</option>
                <option value="Recycle">Recycle</option>
                <option value="Destroy">Destroy</option>
                <option value="Donate">Donate</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Remarks</label>
              <input 
                type="text"
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                placeholder="Final remarks (optional)"
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button
              className="danger-button"
              onClick={() => {
                if (window.confirm("Are you sure you want to complete this disposal? This will permanently deduct the quantity from inventory.")) {
                  handleAction(completeDisposal, "complete", { disposalMethod, remarks: completionRemarks });
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Complete Disposal"}
            </button>
          </div>
        </div>
      )}

      {status === "REJECTED" && (
        <div className="action-panel" style={{ marginTop: "2rem", backgroundColor: "#fff5f5", border: "1px solid #fc8181" }}>
          <h3 style={{ color: "#c53030" }}>Disposal Request Rejected</h3>
          <p>This request has been rejected and cannot proceed further.</p>
        </div>
      )}

      {status === "COMPLETED" && (
        <div className="success-panel" style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#eefcf6", border: "1px solid #34d399", borderRadius: "8px" }}>
          <strong style={{ color: "#047857" }}>Disposal completed successfully.</strong>
          <p style={{ color: "#065f46" }}>Inventory records have been updated by the backend transaction. A Disposal Record has been created.</p>
          {disposal.record && (
             <div style={{ marginTop: "1rem", backgroundColor: "white", padding: "1rem", borderRadius: "4px", border: "1px solid #a7f3d0" }}>
               <div><strong>Disposal Note:</strong> {disposal.record.disposalNumber}</div>
               <div><strong>Method:</strong> {disposal.record.disposalMethod}</div>
               <div><strong>Disposed By:</strong> {disposal.record.disposedBy?.fullName || disposal.record.disposedBy?.username || disposal.record.disposedById}</div>
               <div><strong>Remarks:</strong> {disposal.record.remarks || "-"}</div>
               <div><strong>Date:</strong> {new Date(disposal.record.disposedAt).toLocaleString()}</div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DisposalDetails;