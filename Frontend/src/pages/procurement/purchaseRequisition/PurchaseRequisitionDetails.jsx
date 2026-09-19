import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AuthContext from "../../../context/AuthContext";
import EmptyState from "../../../components/common/EmptyState";
import { fetchPurchaseRequisitionById, submitPurchaseRequisition, approvePurchaseRequisition, rejectPurchaseRequisition, assignPurchaseRequisitionSupplier, displayPurchaseRequisitionStatus } from "../../../api/purchaseRequisition";
import { fetchResource } from "../../../api/masterData";

import "./purchaseRequisitions.css";

function PurchaseRequisitionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useContext(AuthContext);

  const [requisition, setRequisition] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showSupplier, setShowSupplier] = useState(false);
  const [supplierId, setSupplierId] = useState("");

  async function loadDetails() {
    setLoading(true);
    setError("");

    try {
      const record = await fetchPurchaseRequisitionById(id);
      setRequisition(record);

      if (record.status === "APPROVED" && !record.supplierId) {
        const supplierData = await fetchResource("suppliers", { status: "Active", limit: 100 });
        setSuppliers(supplierData || []);
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load purchase requisition.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [id]);

  async function runAction(action) {
    setActionLoading(true);
    setError("");

    try {
      let updated;
      if (action === "submit") {
        updated = await submitPurchaseRequisition(id);
      } else if (action === "approve") {
        updated = await approvePurchaseRequisition(id);
      } else if (action === "reject") {
        if (rejectReason.trim().length < 2) {
          setError("A rejection reason is required.");
          setActionLoading(false);
          return;
        }
        updated = await rejectPurchaseRequisition(id, rejectReason);
      } else if (action === "supplier") {
        if (!supplierId) {
          setError("Select a supplier before assigning one.");
          setActionLoading(false);
          return;
        }
        updated = await assignPurchaseRequisitionSupplier(id, supplierId);
      }

      setRequisition(updated);
      setShowReject(false);
      setRejectReason("");
      setShowSupplier(false);
      setSupplierId("");
    } catch (actionError) {
      setError(actionError.message || "The requested action could not be completed.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="purchase-requisition-page"><div className="purchase-requisition-panel">Loading purchase requisition...</div></div>;
  }

  if (error && !requisition) {
    return (
      <div className="purchase-requisition-page">
        <EmptyState title="Unable to load purchase requisition" message={error} />
        <button type="button" className="secondary-button" onClick={() => navigate("/procurement/requisitions")}>Back to Purchase Requisitions</button>
      </div>
    );
  }

  const canEdit = hasPermission("update_purchase_requisition") && ["DRAFT", "REJECTED"].includes(requisition.status);
  const canSubmit = hasPermission("submit_purchase_requisition") && ["DRAFT", "REJECTED"].includes(requisition.status);
  const canApprove = hasPermission("approve_purchase_requisition") && requisition.status === "PENDING_APPROVAL";
  const canReject = hasPermission("reject_purchase_requisition") && requisition.status === "PENDING_APPROVAL";
  const canAssignSupplier = hasPermission("assign_purchase_requisition_supplier") && requisition.status === "APPROVED" && !requisition.supplierId;
  const purchaseOrderExists = requisition.purchaseOrders?.length > 0;

  return (
    <div className="purchase-requisition-page">
      <div className="purchase-requisition-header">
        <div>
          <button type="button" className="back-link-button" onClick={() => navigate("/procurement-requisitions")}>
            ← Back to Purchase Requisitions
          </button>
          <h1>{requisition.requestNumber}</h1>
          <p>{requisition.purpose}</p>
        </div>
        <span className={`purchase-status purchase-status-${requisition.status.toLowerCase()}`}>
          {displayPurchaseRequisitionStatus(requisition.status)}
        </span>
      </div>

      {error && <div className="purchase-requisition-alert error">{error}</div>}

      <section className="purchase-requisition-panel">
        <div className="section-heading">
          <h2>Request Information</h2>
        </div>

        <div className="detail-grid">
          <div><span>Requester</span><strong>{requisition.requester || "—"}</strong></div>
          <div><span>Department</span><strong>{requisition.department || "—"}</strong></div>
          <div><span>Receiving Store</span><strong>{requisition.store || "—"}</strong></div>
          <div><span>Required Date</span><strong>{requisition.requiredDate ? new Date(requisition.requiredDate).toLocaleDateString() : "—"}</strong></div>
          <div><span>Estimated Cost</span><strong>{requisition.estimatedCost > 0 ? requisition.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</strong></div>
          <div><span>Supplier</span><strong>{requisition.supplier || "Not assigned"}</strong></div>
          <div><span>Created</span><strong>{requisition.createdAt ? new Date(requisition.createdAt).toLocaleDateString() : "—"}</strong></div>
          <div><span>Approved By</span><strong>{requisition.approvedBy?.fullName || "—"}</strong></div>
        </div>

        {requisition.rejectionReason && (
          <div className="rejection-note">
            <strong>Rejection reason</strong>
            <p>{requisition.rejectionReason}</p>
          </div>
        )}
      </section>

      <section className="purchase-requisition-panel">
        <div className="section-heading">
          <h2>Required Items</h2>
        </div>

        <div className="item-table-wrapper">
          <table className="item-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {requisition.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.itemCode || "—"}</td>
                  <td>{item.itemName || "—"}</td>
                  <td>{item.unit || "—"}</td>
                  <td>{item.quantity}</td>
                  <td>{item.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="purchase-requisition-panel">
        <div className="section-heading">
          <h2>Purpose & Notes</h2>
        </div>
        <p className="detail-long-text">{requisition.purpose || "—"}</p>
        {requisition.notes && <p className="detail-long-text secondary-text">{requisition.notes}</p>}
      </section>

      <section className="purchase-requisition-panel workflow-panel">
        <div className="section-heading">
          <h2>Workflow</h2>
          <p>Draft → Submitted/Pending Approval → Approved → Purchase Order → Delivery → Receiving</p>
        </div>

        <div className="workflow-steps">
          <div className={`workflow-step ${requisition.status !== "DRAFT" ? "complete" : "current"}`}><span>1</span><strong>Draft</strong></div>
          <div className={`workflow-step ${["APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(requisition.status) ? "complete" : requisition.status === "PENDING_APPROVAL" ? "current" : ""}`}><span>2</span><strong>Submitted</strong></div>
          <div className={`workflow-step ${["ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(requisition.status) ? "complete" : requisition.status === "APPROVED" ? "current" : ""}`}><span>3</span><strong>Approved</strong></div>
          <div className={`workflow-step ${purchaseOrderExists ? "complete" : ""}`}><span>4</span><strong>Purchase Order</strong></div>
        </div>
      </section>

      {(canEdit || canSubmit || canApprove || canReject || canAssignSupplier || requisition.status === "APPROVED") && (
        <section className="purchase-requisition-action-panel">
          <div>
            <h2>Available Actions</h2>
            <p>Actions are restricted by the purchase requisition workflow and your assigned permissions.</p>
          </div>
          <div className="purchase-requisition-action-buttons">
            {canEdit && (
              <Link to={`/procurement/requisitions/${requisition.id}/edit`} className="secondary-button">Edit</Link>
            )}
            {canSubmit && (
              <button type="button" className="primary-button" disabled={actionLoading} onClick={() => runAction("submit")}>
                {actionLoading ? "Processing..." : "Submit for Approval"}
              </button>
            )}
            {canApprove && (
              <button type="button" className="primary-button" disabled={actionLoading} onClick={() => runAction("approve")}>
                {actionLoading ? "Processing..." : "Approve"}
              </button>
            )}
            {canReject && !showReject && (
              <button type="button" className="danger-button" disabled={actionLoading} onClick={() => setShowReject(true)}>
                Reject
              </button>
            )}
            {canAssignSupplier && !showSupplier && (
              <button type="button" className="secondary-button" disabled={actionLoading} onClick={() => setShowSupplier(true)}>
                Assign Supplier
              </button>
            )}
            {requisition.status === "APPROVED" && !purchaseOrderExists && hasPermission("view_purchase_order") && (
              <Link to="/purchase-orders" className="primary-button">
                Continue to Purchase Orders
              </Link>
            )}
            {purchaseOrderExists && (
              <Link to="/purchase-orders" className="secondary-button">View Purchase Orders</Link>
            )}
          </div>
        </section>
      )}

      {showReject && (
        <section className="purchase-requisition-panel action-editor">
          <h3>Reject Purchase Requisition</h3>
          <label htmlFor="rejectReason">Reason <span>*</span></label>
          <textarea id="rejectReason" rows="3" maxLength="500" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Explain why this requisition is being rejected." />
          <div className="purchase-requisition-action-buttons">
            <button type="button" className="secondary-button" onClick={() => setShowReject(false)} disabled={actionLoading}>Cancel</button>
            <button type="button" className="danger-button" onClick={() => runAction("reject")} disabled={actionLoading || rejectReason.trim().length < 2}>{actionLoading ? "Rejecting..." : "Confirm Rejection"}</button>
          </div>
        </section>
      )}

      {showSupplier && (
        <section className="purchase-requisition-panel action-editor">
          <h3>Assign Supplier</h3>
          <label htmlFor="supplierId">Supplier <span>*</span></label>
          <select id="supplierId" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.code ? `${supplier.code} — ` : ""}{supplier.name}</option>
            ))}
          </select>
          <div className="purchase-requisition-action-buttons">
            <button type="button" className="secondary-button" onClick={() => setShowSupplier(false)} disabled={actionLoading}>Cancel</button>
            <button type="button" className="primary-button" onClick={() => runAction("supplier")} disabled={actionLoading || !supplierId}>{actionLoading ? "Saving..." : "Assign Supplier"}</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default PurchaseRequisitionDetails;
