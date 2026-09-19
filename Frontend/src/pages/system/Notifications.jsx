import { useCallback, useEffect, useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import { api } from "../../api/client";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications", { 
        page, 
        limit: 25,
        ...(unreadOnly ? { unreadOnly: true } : {}),
        ...(type ? { type } : {})
      });
      
      const newItems = response.data || [];
      if (newItems.length === 0 && page > 1) {
        setPage(p => p - 1);
        return;
      }

      setItems(newItems);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function read(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function all() {
    try {
      await api.patch("/notifications/read-all");
      await load();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  return (
    <div className="master-page">
      <PageHeader title="Notifications" description="Live workflow notifications from the backend." />
      
      <div className="controls" style={{ marginBottom: "20px", display: "flex", gap: "15px", alignItems: "center" }}>
        <button type="button" className="btn btn-primary" onClick={all}>Mark all as read</button>
        
        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <input 
            type="checkbox" 
            checked={unreadOnly} 
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }} 
            aria-label="Filter unread only"
          />
          Unread only
        </label>
        
        <select 
          value={type} 
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="form-control"
          style={{ width: "auto" }}
          aria-label="Filter by notification type"
        >
          <option value="">All Types</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="GOODS_RECEIVED">Goods Received</option>
          <option value="INSPECTION_REQUIRED">Inspection Required</option>
          <option value="TRANSFER_APPROVAL">Transfer Approval</option>
          <option value="DISPOSAL_APPROVAL">Disposal Approval</option>
          <option value="STOCK_DISCREPANCY">Stock Discrepancy</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      {error && <p style={{ color: "red", padding: "10px", backgroundColor: "#ffebee", borderRadius: "4px" }}>{error}</p>}
      
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ padding: "20px", textAlign: "center", color: "#666", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          No notifications found.
        </p>
      ) : (
        <div className="notification-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((notification) => (
            <article 
              key={notification.id} 
              style={{
                border: "1px solid #e0e0e0",
                padding: "15px",
                borderRadius: "8px",
                backgroundColor: notification.isRead ? "#f9f9f9" : "#ffffff",
                boxShadow: notification.isRead ? "none" : "0 2px 4px rgba(0,0,0,0.05)"
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", color: notification.isRead ? "#757575" : "#212121" }}>
                {notification.title}
              </h3>
              <p style={{ margin: "0 0 12px 0", color: notification.isRead ? "#9e9e9e" : "#424242" }}>
                {notification.message}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <small style={{ color: "#9e9e9e" }}>
                  {new Date(notification.createdAt).toLocaleString()} &bull; {notification.type}
                </small>
                {!notification.isRead && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary" 
                    onClick={() => read(notification.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="pagination" style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "center", justifyContent: "center" }}>
          <button 
            className="btn btn-outline-secondary"
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button 
            className="btn btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
