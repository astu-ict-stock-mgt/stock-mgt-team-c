import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchShelfLifeBatchById } from "../../../api/shelfLife";
import "../control.css";

function ShelfLifeDetails() {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const data = await fetchShelfLifeBatchById(id);
      if (data) {
        setItem(data);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || "Failed to load shelf life details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="control-page">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="control-page">
        <h1>Shelf-Life Item Not Found</h1>
        <Link to="/shelf-life">← Back to Shelf Life</Link>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="control-page">
        <h1>Error Loading Details</h1>
        <p style={{ color: "#ef4444" }}>{error}</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
          <button onClick={loadData} className="primary-button">Retry</button>
          <Link to="/shelf-life" className="secondary-button" style={{ display: "inline-block", padding: "0.5rem 1rem", border: "1px solid #ccc", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>← Back to Shelf Life</Link>
        </div>
      </div>
    );
  }

  const shelfStatus = item.shelfStatus;

  return (
    <div className="control-page">
      <div className="page-header">
        <div>
          <Link to="/shelf-life">← Shelf-Life Monitoring</Link>
          <h1>{item.itemName}</h1>
          <p>{item.itemCode}</p>
        </div>
      </div>

      <div className="table-card">
        <h2>Shelf-Life Information</h2>

        <div className="detail-row">
          <span className="detail-label">Item</span>
          <span className="detail-value">{item.itemName}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Item Code</span>
          <span className="detail-value">{item.itemCode}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Batch</span>
          <span className="detail-value">{item.batchNumber}</span>
        </div>
        
        <div className="detail-row">
          <span className="detail-label">Location</span>
          <span className="detail-value">{item.locationLabel}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Expiry Date</span>
          <span className="detail-value">{item.expiryDate}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Days Remaining</span>
          <span className="detail-value">
            {shelfStatus.days === null
              ? "N/A"
              : shelfStatus.days < 0
              ? `${Math.abs(shelfStatus.days)} days overdue`
              : `${shelfStatus.days} days`}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Quantity</span>
          <span className="detail-value">{item.quantity}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value">
            <span
              className={`status-badge ${shelfStatus.label.toLowerCase().replaceAll(" ", "-").replaceAll("/", "")}`}
            >
              {shelfStatus.label}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default ShelfLifeDetails;