import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchReturnById, approveReturn, rejectReturn, receiveReturn } from "../../api/returns";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import "./returns.css";

function ReturnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [returnItem, setReturnItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchReturnById(id);
      setReturnItem(data);
    } catch (err) {
      console.error("Unable to load return:", err);
      setReturnItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="module-page">
        <div className="empty-state">Loading return...</div>
      </div>
    );
  }

  if (!returnItem) {
    return (
      <div className="module-page">
        <div className="empty-state">
          <h2>Return Not Found</h2>
          <Link to="/returns">Back to Returns</Link>
        </div>
      </div>
    );
  }

  async function handleReceive() {
    try {
      setActionPending(true);
      await receiveReturn(returnItem.id);
      await load();
    } catch (err) {
      console.error("Receive failed:", err);
      alert(err?.message || "Unable to receive return.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleApprove() {
    if (!window.confirm("Are you sure you want to Accept this return? This will update the inventory ledger.")) return;
    try {
      setActionPending(true);
      await approveReturn(returnItem.id);
      await load();
    } catch (err) {
      console.error("Approve failed:", err);
      alert(err?.message || "Unable to approve return.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleReject() {
    const reason = prompt("Enter rejection remarks:");
    if (reason === null) return;
    try {
      setActionPending(true);
      await rejectReturn(returnItem.id, reason);
      await load();
    } catch (err) {
      console.error("Reject failed:", err);
      alert(err?.message || "Unable to reject return.");
    } finally {
      setActionPending(false);
    }
  }

  function formatStatus(status) {
    switch (status) {
      case "RETURN_REQUEST": return "Pending Receive";
      case "RECEIVED": return "Pending Inspection";
      case "INSPECTED": return "Inspected";
      case "ACCEPTED": return "Accepted";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  }

  function getStatusClass(status) {
    if (!status) return "status-draft";
    return `status status-${status.toLowerCase().replaceAll("_", "-")}`;
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <Link to="/returns" className="back-link">
            &larr; Returns
          </Link>
          <h1>{returnItem.returnNumber || returnItem.id.split("-")[0]}</h1>
          <p>Store Return Note details and inspection result.</p>
        </div>

        <div className="page-header-actions">
          <span className={getStatusClass(returnItem.status)}>
            {formatStatus(returnItem.status)}
          </span>

          {returnItem.status === "RETURN_REQUEST" && hasPermission("receive_material_return") && (
            <button className="primary-button" onClick={handleReceive} disabled={actionPending}>
              {actionPending ? "Processing..." : "Receive Return"}
            </button>
          )}

          {returnItem.status === "RECEIVED" && hasPermission("inspect_material_return") && (
            <Link to={`/returns/${returnItem.id}/inspect`} className="secondary-button" style={{ pointerEvents: actionPending ? "none" : "auto" }}>
              Inspect Return
            </Link>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="form-card">
          <h2>Return Information</h2>
          <div className="detail-list">
            <div>
              <span>Return Number</span>
              <strong>{returnItem.returnNumber || returnItem.id}</strong>
            </div>
            <div>
              <span>Store Issue ID</span>
              <strong>{returnItem.storeIssue?.issueNo || returnItem.storeIssueId}</strong>
            </div>
            <div>
              <span>Requester</span>
              <strong>{returnItem.requester?.fullName || returnItem.requester?.username || "-"}</strong>
            </div>
            <div>
              <span>Department</span>
              <strong>{returnItem.department?.name || returnItem.departmentId || "-"}</strong>
            </div>
            <div>
              <span>Store</span>
              <strong>{returnItem.store?.name || returnItem.storeId || "-"}</strong>
            </div>
            <div>
              <span>Return Date</span>
              <strong>{new Date(returnItem.createdAt).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {(returnItem.status === "INSPECTED" || returnItem.status === "ACCEPTED" || returnItem.status === "REJECTED") && (
          <div className="form-card">
            <h2>Inspection Results</h2>
            <div className="detail-list">
              <div>
                <span>Inspected At</span>
                <strong>{returnItem.inspectedAt ? new Date(returnItem.inspectedAt).toLocaleString() : "-"}</strong>
              </div>
              <div>
                <span>Conditions</span>
                <strong>{returnItem.items.map((item) => item.condition).filter(Boolean).join(", ") || "-"}</strong>
              </div>
            </div>

            {returnItem.status === "INSPECTED" && (
              <div className="form-actions" style={{ marginTop: "1rem" }}>
                {hasPermission("reject_material_return") && (
                  <button type="button" className="danger-button" onClick={handleReject} disabled={actionPending}>
                    Reject Return
                  </button>
                )}
                {hasPermission("approve_material_return") && (
                  <button type="button" className="primary-button" onClick={handleApprove} disabled={actionPending}>
                    Accept Return
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-card">
        <h2>Returned Items</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Item Code</th>
                <th>Item</th>
                <th>Returned Qty</th>
                <th>Accepted Qty</th>
                <th>Rejected Qty</th>
                <th>Condition</th>
              </tr>
            </thead>
            <tbody>
              {returnItem.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>{item.item?.code || item.itemId}</td>
                  <td>{item.item?.name || "-"}</td>
                  <td>{item.returnedQuantity}</td>
                  <td>{item.acceptedQuantity ?? "-"}</td>
                  <td>{item.rejectedQuantity ?? "-"}</td>
                  <td>{item.condition || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-card">
        <h2>Return Reason</h2>
        <p>{returnItem.reason || "No reason provided."}</p>

        {returnItem.remarks && (
          <>
            <h3 style={{ marginTop: "1rem" }}>Notes</h3>
            <p>{returnItem.remarks}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default ReturnDetails;