import { useEffect, useState } from "react";
import receivingService from "../../../services/receivingService";

function InspectionDetails({
  inspectionId,
  onBack
}) {
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        setError("");
        const result = await receivingService.getInspection(inspectionId);
        setInspection(result.inspection);
      } catch (err) {
        setError(err.message || "Failed to load inspection details");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [inspectionId]);

  const updateStatus = async (decision) => {
    if (!window.confirm(`Are you sure you want to ${decision.toLowerCase()} this inspection?`)) return;

    try {
      setActionLoading(true);
      setError("");
      await receivingService.evaluateInspection(inspectionId, { decision, remarks: remarks.trim() || undefined });
      
      // Reload details to show updated state
      const result = await receivingService.getInspection(inspectionId);
      setInspection(result.inspection);
    } catch (err) {
      setError(err.message || "Failed to evaluate inspection");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="master-page">
        <button type="button" className="secondary-button" onClick={onBack} style={{ marginBottom: "20px" }}>← Back</button>
        <p style={{ textAlign: "center", padding: "30px" }}>Loading inspection details...</p>
      </div>
    );
  }

  if (error && !inspection) {
    return (
      <div className="master-page">
        <button type="button" className="secondary-button" onClick={onBack} style={{ marginBottom: "20px" }}>← Back</button>
        <p style={{ textAlign: "center", padding: "30px" }} className="form-error">Error: {error}</p>
      </div>
    );
  }

  if (!inspection) return null;

  return (
    <div className="master-page">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" className="secondary-button" onClick={onBack}>
          ← Back to Inspection List
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="details-card">
        <div className="page-header" style={{ marginBottom: "20px" }}>
          <div>
            <h1>{inspection.goodsReceipt?.receiptNumber || "N/A"}</h1>
            <p>{inspection.goodsReceipt?.supplier?.name || "N/A"}</p>
          </div>
          <span className={`status-badge ${inspection.status.toLowerCase().replaceAll(" ", "-")}`}>
            {inspection.status === "PENDING" ? "Pending" : inspection.status}
          </span>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Store</span>
            <span className="detail-value">{inspection.goodsReceipt?.store?.name || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Inspection Date</span>
            <span className="detail-value">{inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Inspector</span>
            <span className="detail-value">{inspection.inspector?.fullName || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Quantity Verification</span>
            <span className="detail-value">{inspection.quantityVerification || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Quality Verification</span>
            <span className="detail-value">{inspection.qualityVerification || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Inspection Remarks</span>
            <span className="detail-value">{inspection.remarks || "No remarks provided."}</span>
          </div>
        </div>

        {/* ITEMS SECTION */}
        <div style={{ marginTop: "30px" }}>
          <h3>Inspected Items</h3>
          <div className="data-table-wrapper" style={{ marginTop: "10px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Received</th>
                  <th>Accepted</th>
                  <th>Rejected</th>
                  <th>Condition</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {inspection.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.goodsReceiptItem?.item?.code || "N/A"}</td>
                    <td>{item.goodsReceiptItem?.item?.name || "N/A"}</td>
                    <td>{item.goodsReceiptItem?.quantityReceived || "N/A"}</td>
                    <td>{item.acceptedQuantity}</td>
                    <td>{item.rejectedQuantity}</td>
                    <td>{item.condition || "N/A"}</td>
                    <td>
                      <span className={`status-badge ${item.result?.toLowerCase().replaceAll(" ", "-")}`}>
                        {item.result}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!inspection.items || inspection.items.length === 0) && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No items inspected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EVALUATION DISPLAY SECTION (IF EVALUATED) */}
        {inspection.status !== "PENDING" && (
          <div style={{ marginTop: "30px", padding: "20px", background: "var(--background-secondary)", borderRadius: "8px" }}>
            <h3>Evaluation Details</h3>
            <div className="details-grid" style={{ marginTop: "15px" }}>
              <div className="detail-item">
                <span className="detail-label">Decision</span>
                <span className="detail-value">
                  <span className={`status-badge ${inspection.decision?.toLowerCase().replaceAll(" ", "-")}`}>
                    {inspection.decision}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Evaluator</span>
                <span className="detail-value">{inspection.evaluator?.fullName || inspection.approvedById || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Evaluation Date</span>
                <span className="detail-value">{inspection.approvedAt ? new Date(inspection.approvedAt).toLocaleString() : "N/A"}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                <span className="detail-label">Evaluation Remarks</span>
                <span className="detail-value">{inspection.remarks || "No evaluation remarks provided."}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* EVALUATION FORM (IF PENDING) */}
      {inspection.status === "PENDING" && (
        <div className="form-card" style={{ marginTop: "20px" }}>
          <h3>Evaluate Inspection</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "15px" }}>Provide remarks and a decision for this inspection.</p>
          
          <div className="form-group full-width">
            <label htmlFor="eval-remarks">Evaluation Remarks (Optional)</label>
            <textarea
              id="eval-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter any evaluation remarks (max 1000 characters)"
              rows={4}
              maxLength={1000}
              disabled={actionLoading}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              type="button"
              className="danger-button"
              disabled={actionLoading}
              onClick={() => updateStatus("REJECTED")}
            >
              {actionLoading ? "Processing..." : "Reject Inspection"}
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={actionLoading}
              onClick={() => updateStatus("APPROVED")}
            >
              {actionLoading ? "Processing..." : "Approve Inspection"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default InspectionDetails;