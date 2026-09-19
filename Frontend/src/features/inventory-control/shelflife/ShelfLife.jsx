import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchShelfLifeBatches } from "../../../api/shelfLife";
import RegisterBatchModal from "./RegisterBatchModal";
import "../control.css";

function ShelfLife() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const nextItems = await fetchShelfLifeBatches();
      setItems(nextItems);
    } catch (err) {
      setError(err.message || "Failed to load shelf life items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const value = search.trim().toLowerCase();

      const matchesSearch =
        item.itemName?.toLowerCase()?.includes(value) ||
        item.itemCode?.toLowerCase()?.includes(value) ||
        item.batchNumber?.toLowerCase()?.includes(value) ||
        item.locationLabel?.toLowerCase()?.includes(value);

      const matchesFilter = filter === "All" || item.shelfStatus.label === filter;

      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  const handleRegisterSuccess = () => {
    setShowRegisterModal(false);
    loadItems();
  };

  return (
    <div className="control-page">
      <div className="page-header">
        <div>
          <h1>Shelf-Life Monitoring</h1>
          <p>Monitor expiry dates and materials approaching or exceeding their shelf life.</p>
        </div>
        <button className="primary-button" onClick={() => setShowRegisterModal(true)}>
          Register Batch
        </button>
      </div>

      {showRegisterModal && (
        <RegisterBatchModal 
          onClose={() => setShowRegisterModal(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}

      <div className="control-panel">
        <input
          type="text"
          placeholder="Search item, code, batch or location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="All">All Items</option>
          <option value="Safe">Safe</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Expired">Expired</option>
          <option value="N/A">N/A</option>
        </select>
      </div>

      {error && (
        <div className="danger-button" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span>{error}</span>
          <button onClick={loadItems} style={{ background: "transparent", border: "1px solid currentColor", color: "inherit", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Batch</th>
              <th>Location</th>
              <th>Expiry Date</th>
              <th>Days Remaining</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "30px" }}>Loading shelf-life items...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "30px" }}>
                  {error ? "Failed to load data." : "No shelf-life items found."}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.itemName}</strong></td>
                  <td>{item.itemCode}</td>
                  <td>{item.batchNumber}</td>
                  <td>{item.locationLabel}</td>
                  <td>{item.expiryDate}</td>
                  <td>
                    {item.shelfStatus.days === null
                      ? "N/A"
                      : item.shelfStatus.days < 0
                      ? `${Math.abs(item.shelfStatus.days)} days overdue`
                      : `${item.shelfStatus.days} days`}
                  </td>
                  <td>{item.quantity}</td>
                  <td>
                    <span
                      className={`status-badge ${item.shelfStatus.label.toLowerCase().replaceAll(" ", "-").replaceAll("/", "")}`}
                    >
                      {item.shelfStatus.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <Link className="table-action" to={`/shelf-life/${item.id}`}>View</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ShelfLife;