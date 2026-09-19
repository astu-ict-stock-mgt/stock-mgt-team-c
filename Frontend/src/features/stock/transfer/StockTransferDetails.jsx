import { Link, useParams } from "react-router-dom";
import { fetchTransferById, submitTransfer, approveTransfer, completeTransfer } from "../../../api/stockTransfers";
import { useEffect, useState } from "react";
import "../StockPage.css";

function StockTransferDetails() {
  const { id } = useParams();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchTransferById(id);
        if (!mounted) return;
        setTransfer(data);
        setError("");
      } catch (err) {
        console.error("Unable to load transfer:", err);
        if (mounted) {
          setTransfer(null);
          setError(err.message || "Failed to load transfer.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="stock-page">
        <div className="stock-page-header">
          <div>
            <h1>Stock Transfer</h1>
            <p>Loading transfer...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="stock-page">
        <h1>{error || "Transfer Not Found"}</h1>
        <Link to="/stock-transfers">← Back to Transfers</Link>
      </div>
    );
  }

  const handleAction = async (actionFn, actionName) => {
    try {
      setLoading(true);
      await actionFn(transfer.id);
      const data = await fetchTransferById(transfer.id);
      setTransfer(data);
    } catch (err) {
      console.error(`Failed to ${actionName} transfer:`, err);
      alert(`Failed to ${actionName} transfer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "DRAFT": return "status-inactive";
      case "SUBMITTED": return "status-pending";
      case "APPROVED": return "status-approved";
      case "COMPLETED": return "status-transferred";
      case "REJECTED": return "status-rejected";
      case "CANCELLED": return "status-rejected";
      default: return "status-active";
    }
  };

  return (
    <div className="stock-page">
      {/* HEADER */}
      <div className="stock-page-header">
        <div>
          <Link to="/stock-transfers">← Stock Transfers</Link>
          <h1>{transfer.transferNumber || transfer.id}</h1>
          <p>Transfer Details</p>
        </div>

        <div className="stock-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className={`stock-status ${getStatusClass(transfer.status)}`}>
            {transfer.status}
          </span>

          {transfer.status === "DRAFT" && (
            <button
              className="stock-button stock-button-primary"
              onClick={() => handleAction(submitTransfer, "submit")}
            >
              Submit
            </button>
          )}

          {transfer.status === "SUBMITTED" && (
            <button
              className="stock-button stock-button-primary"
              onClick={() => handleAction(approveTransfer, "approve")}
            >
              Approve
            </button>
          )}

          {transfer.status === "APPROVED" && (
            <button
              className="stock-button stock-button-primary"
              onClick={() => handleAction(completeTransfer, "complete")}
            >
              Complete Transfer
            </button>
          )}
        </div>
      </div>

      {/* INFORMATION */}
      <div className="stock-detail-grid">
        <div className="stock-detail-card">
          <h2>Transfer Information</h2>
          <div className="detail-row">
            <span className="detail-label">Transfer No.</span>
            <span className="detail-value">{transfer.transferNumber || transfer.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date</span>
            <span className="detail-value">{new Date(transfer.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Requested By</span>
            <span className="detail-value">{transfer.requestedBy?.fullName || transfer.requestedBy?.username || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Approved By</span>
            <span className="detail-value">{transfer.approvedBy?.fullName || transfer.approvedBy?.username || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">{transfer.status}</span>
          </div>
        </div>

        {/* MOVEMENT */}
        <div className="stock-detail-card">
          <h2>Movement</h2>
          <div className="detail-row">
            <span className="detail-label">Source Store</span>
            <span className="detail-value">{transfer.sourceLocation?.store?.name || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Source Bin</span>
            <span className="detail-value">{transfer.sourceLocation?.code || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Destination Store</span>
            <span className="detail-value">{transfer.destinationLocation?.store?.name || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Destination Bin</span>
            <span className="detail-value">{transfer.destinationLocation?.code || "-"}</span>
          </div>
        </div>
      </div>

      {/* ITEMS LIST */}
      <div className="stock-detail-card" style={{ marginTop: "20px" }}>
        <h2>Transfer Items</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="master-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Transaction Reference</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items && transfer.items.length > 0 ? (
                transfer.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.item?.code || "-"}</td>
                    <td>{it.item?.name || "-"}</td>
                    <td>{Number(it.quantity)}</td>
                    <td>
                      {it.transactionId ? (
                        <Link to={`/transactions/${it.transactionId}`}>View Transaction</Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No items listed.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REASON */}
      <div className="stock-detail-card" style={{ marginTop: "20px" }}>
        <h2>Transfer Reason</h2>
        <p>{transfer.reason || "No reason provided."}</p>
        {transfer.remarks && (
          <>
            <h2 style={{ marginTop: "20px" }}>Remarks</h2>
            <p>{transfer.remarks}</p>
          </>
        )}
      </div>

    </div>
  );
}

export default StockTransferDetails;