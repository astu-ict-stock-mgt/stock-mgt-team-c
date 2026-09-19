import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import receivingService from "../../services/receivingService";
import { useAuth } from "../../context/useAuth";

function ReceivingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadReceipt() {
    setLoading(true);
    setError("");
    try {
      const result = await receivingService.getById(id);
      setReceipt(result.receipt);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    receivingService.getById(id)
      .then((result) => {
        if (active) setReceipt(result.receipt);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function verifyReceipt() {
    setWorking(true);
    setError("");
    try {
      await receivingService.verify(id);
      await loadReceipt();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  async function createGRN() {
    setWorking(true);
    setError("");
    try {
      const result = await receivingService.createGRN({
        goodsReceiptId: id,
        documentReference: receipt.documentReference || undefined,
      });
      navigate(`/grn/${result.grn.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <div className="page-container"><p>Loading receipt...</p></div>;
  if (!receipt) return <div className="page-container"><p className="form-error">{error || "Receipt not found."}</p><Link to="/receiving">Back to Receiving</Link></div>;

  const inspection = receipt.inspections?.[receipt.inspections.length - 1];
  const grn = receipt.grns;
  const statusClass = receipt.status.toLowerCase().replaceAll("_", "-");

  return (
    <div className="page-container">
      {error && <p className="form-error">{error}</p>}
      <div className="page-header">
        <div>
          <Link to="/receiving">Back to Receiving</Link>
          <h1>{receipt.receiptNumber}</h1>
          <p>{receipt.supplier?.name || "Supplier unavailable"}</p>
        </div>
        <span className={`status-badge ${statusClass}`}>{receipt.status}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-card"><span>Supplier</span><strong>{receipt.supplier?.name}</strong></div>
        <div className="detail-card"><span>Store</span><strong>{receipt.store?.name}</strong></div>
        <div className="detail-card"><span>Delivery Date</span><strong>{new Date(receipt.deliveryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong></div>
        <div className="detail-card"><span>Document Reference</span><strong>{receipt.documentReference || "N/A"}</strong></div>
        <div className="detail-card"><span>Purchase Reference</span><strong>{receipt.purchaseReference || "N/A"}</strong></div>
        <div className="detail-card"><span>Evaluation</span><strong>{receipt.evaluationDecision || "Pending"}</strong></div>
      </div>

      <div className="table-card">
        <div className="section-header"><h2>Received Items</h2></div>
        <table>
          <thead><tr><th>Item</th><th>Expected</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Location</th><th>Unit</th></tr></thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.id}>
                <td>{item.item?.name || item.item?.code}</td>
                <td>{item.quantityExpected}</td>
                <td>{item.quantityReceived}</td>
                <td>{item.acceptedQuantity}</td>
                <td>{item.rejectedQuantity}</td>
                <td>{item.location?.code || "Not assigned"}</td>
                <td>{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inspection && <div className="detail-card"><span>Inspection Remarks</span><strong>{inspection.remarks || "None"}</strong></div>}

      <div className="form-actions">
        {receipt.status === "VERIFICATION_PENDING" && <button className="primary-button" type="button" onClick={verifyReceipt} disabled={working}>Verify Receipt</button>}
        {(receipt.status === "INSPECTION_PENDING" || receipt.status === "INSPECTED") && <Link className="primary-button" to={`/receiving/${id}/evaluation`}>Technical Evaluation</Link>}
        {receipt.status === "APPROVED" && !grn && hasPermission('view_grn') && <button className="primary-button" type="button" onClick={createGRN} disabled={working}>Generate GRN and Post Stock</button>}
        {grn && hasPermission('view_grn') && <Link className="secondary-button" to={`/grn/${grn.id}`}>View GRN</Link>}
      </div>
    </div>
  );
}

export default ReceivingDetails;
