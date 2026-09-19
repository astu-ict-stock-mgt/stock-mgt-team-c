import { useState } from "react";
import { approveAdjustment, rejectAdjustment } from "./stockAdjustmentData";

function StockAdjustmentDetails({ adjustment, onBack, onRefresh }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    if (status === 'Pending Authorization') return 'pending';
    return '';
  };

  const handleApprove = async () => {
    const confirmed = window.confirm(`Are you sure you want to approve adjustment ${adjustment.number}?`);
    if (!confirmed) return;

    setProcessing(true);
    setError(null);
    try {
      await approveAdjustment(adjustment.id);
      onRefresh();
    } catch (err) {
      setError(err.message || "Failed to approve adjustment.");
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt(`Enter rejection reason for adjustment ${adjustment.number}:`);
    if (reason === null) return; // User cancelled prompt
    
    if (!reason.trim()) {
      alert("A rejection reason is required.");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      await rejectAdjustment(adjustment.id, { reason: reason.trim() });
      onRefresh();
    } catch (err) {
      setError(err.message || "Failed to reject adjustment.");
      setProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <button type="button" className="secondary-button" onClick={onBack}>
          ← Back to Adjustments
        </button>

        {adjustment.status === "Pending Authorization" && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleReject}
              disabled={processing}
              style={{ borderColor: "red", color: "red" }}
            >
              Reject Adjustment
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleApprove}
              disabled={processing}
            >
              Approve Adjustment
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message" style={{ color: "red", marginBottom: "16px", padding: "12px", background: "#fdf2f2", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{adjustment.number}</h1>
            <p>Stock Adjustment Details</p>
          </div>

          <span className={`status-badge ${getStatusClass(adjustment.status)}`}>{adjustment.status}</span>
        </div>

        <div className="details-grid">
          {[
            ["Adjustment Number", adjustment.number],
            ["Item", adjustment.item],
            ["Location", adjustment.location],
            ["Adjustment Quantity", adjustment.quantity],
            ["Direction", adjustment.direction],
            ["Adjustment Date", adjustment.date],
            ["Reason", adjustment.reason],
            ["Requested By", adjustment.requestedBy],
            ["Approved By", adjustment.approvedBy],
            ["Status", adjustment.status],
            ["Rejection Reason", adjustment.rejectionReason],
          ].map(([label, value]) => {
            if (value === undefined || value === null || value === "") return null;
            return (
              <div className="detail-item" key={label}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StockAdjustmentDetails;