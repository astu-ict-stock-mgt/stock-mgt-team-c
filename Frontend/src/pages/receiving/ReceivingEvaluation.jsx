import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import receivingService from "../../services/receivingService";

function ReceivingEvaluation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [decision, setDecision] = useState("APPROVED");
  const [quantityVerification, setQuantityVerification] = useState("Passed");
  const [qualityVerification, setQualityVerification] = useState("Passed");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    receivingService.getById(id)
      .then((result) => setReceipt(result.receipt))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const inspection = receipt.inspections?.[receipt.inspections.length - 1];
      let inspectionId = inspection?.id;

      if (!inspectionId) {
        const result = await receivingService.createInspection({
          goodsReceiptId: id,
          quantityVerification,
          qualityVerification,
          remarks: remarks.trim() || undefined,
          items: receipt.items.map((item) => ({
            goodsReceiptItemId: item.id,
            acceptedQuantity: decision === "APPROVED" ? item.quantityReceived : 0,
            rejectedQuantity: decision === "APPROVED" ? 0 : item.quantityReceived,
            condition: item.condition || undefined,
            result: decision === "APPROVED" ? "ACCEPTED" : "REJECTED",
            remarks: remarks.trim() || undefined,
          })),
        });
        inspectionId = result.inspection.id;
      }

      await receivingService.evaluateInspection(inspectionId, {
        decision,
        remarks: remarks.trim() || undefined,
      });
      navigate(`/receiving/${id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-container"><p>Loading evaluation...</p></div>;
  if (!receipt) return <div className="page-container"><p className="form-error">{error || "Receipt not found."}</p><Link to="/receiving">Back to Receiving</Link></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to={`/receiving/${id}`}>Back to Receipt</Link>
          <h1>Technical Evaluation</h1>
          <p>{receipt.receiptNumber} | {receipt.supplier?.name}</p>
        </div>
        <span className="status-badge warning">{receipt.status}</span>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-card">
        <table>
          <thead><tr><th>Item</th><th>Expected</th><th>Received</th><th>Location</th></tr></thead>
          <tbody>{receipt.items.map((item) => <tr key={item.id}><td>{item.item?.name || item.item?.code}</td><td>{item.quantityExpected}</td><td>{item.quantityReceived}</td><td>{item.location?.code || "Not assigned"}</td></tr>)}</tbody>
        </table>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group"><label htmlFor="quantity-verification">Quantity Verification</label><select id="quantity-verification" value={quantityVerification} onChange={(event) => setQuantityVerification(event.target.value)}><option>Passed</option><option>Failed</option><option>Discrepancy Found</option></select></div>
          <div className="form-group"><label htmlFor="quality-verification">Quality Verification</label><select id="quality-verification" value={qualityVerification} onChange={(event) => setQualityVerification(event.target.value)}><option>Passed</option><option>Failed</option><option>Requires Further Inspection</option></select></div>
          <div className="form-group"><label htmlFor="decision">Decision</label><select id="decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></div>
          <div className="form-group full-width"><label htmlFor="evaluation-remarks">Remarks</label><textarea id="evaluation-remarks" rows="5" value={remarks} onChange={(event) => setRemarks(event.target.value)} required /></div>
        </div>
        <div className="form-actions"><Link className="secondary-button" to={`/receiving/${id}`}>Cancel</Link><button className={decision === "APPROVED" ? "primary-button" : "danger-button"} type="submit" disabled={submitting}>{submitting ? "Saving..." : decision === "APPROVED" ? "Approve Receipt" : "Reject Receipt"}</button></div>
      </form>
    </div>
  );
}

export default ReceivingEvaluation;
