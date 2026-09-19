import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

import dashboardData from "./dashboardData";
import PageHeader from "../../components/common/PageHeader";
import "./Dashboard.css";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    summary: {},
    recentTransactions: [],
    pendingRequisitions: [],
    pendingReceipts: [],
    pendingApprovals: [],
    stockMovement: [],
    stores: [],
    alerts: [],
    activity: [],
    reportsSummary: {},
  });

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const payload = await dashboardData.getOverview();

        if (!mounted) return;

        setData({
          summary: payload?.summary || {},
          recentTransactions: Array.isArray(payload?.recentTransactions) ? payload.recentTransactions : [],
          pendingRequisitions: Array.isArray(payload?.pendingRequisitions) ? payload.pendingRequisitions : [],
          pendingReceipts: Array.isArray(payload?.pendingReceipts) ? payload.pendingReceipts : [],
          pendingApprovals: Array.isArray(payload?.pendingApprovals) ? payload.pendingApprovals : [],
          stockMovement: Array.isArray(payload?.stockMovement) ? payload.stockMovement : [],
          stores: Array.isArray(payload?.stores) ? payload.stores : [],
          alerts: Array.isArray(payload?.alerts) ? payload.alerts : [],
          activity: Array.isArray(payload?.activity) ? payload.activity : [],
          reportsSummary: payload?.reportsSummary || {},
        });
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Unable to load dashboard data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => data?.summary || {}, [data]);
  const recentTransactions = Array.isArray(data?.recentTransactions) ? data.recentTransactions : [];
  const pendingRequisitions = Array.isArray(data?.pendingRequisitions) ? data.pendingRequisitions : [];
  const pendingReceipts = Array.isArray(data?.pendingReceipts) ? data.pendingReceipts : [];
  const pendingApprovals = Array.isArray(data?.pendingApprovals) ? data.pendingApprovals : [];
  const stockMovement = Array.isArray(data?.stockMovement) ? data.stockMovement : [];
  const stores = Array.isArray(data?.stores) ? data.stores : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
  const activity = Array.isArray(data?.activity) ? data.activity : [];
  const reportsSummary = data?.reportsSummary || {};

  const getTransactionClassName = (type) => {
    if (!type) return 'issue';
    const t = type.toUpperCase();
    if (t === 'INBOUND') return 'receipt';
    if (t === 'OUTBOUND') return 'issue';
    if (t === 'TRANSFER') return 'transfer';
    if (t === 'RETURN') return 'return';
    if (t === 'ADJUSTMENT') return 'adjustment';
    return 'issue';
  };

  const summaryCards = useMemo(() => [
    { label: "Total Inventory Items", value: summary.totalItems ?? 0 },
    { label: "Low Stock Alerts", value: summary.lowStock ?? 0 },
    { label: "Pending Requisitions", value: summary.pendingRequisitions ?? pendingRequisitions.length },
    { label: "Pending Receipts", value: summary.pendingReceipts ?? pendingReceipts.length },
  ], [summary, pendingRequisitions.length, pendingReceipts.length]);

  if (loading) return <div className="page-container dashboard-page"><PageHeader title="Dashboard" description="Overview of stock movement and operational activity." /><p>Loading dashboard data...</p></div>;
  if (error) return <div className="page-container dashboard-page"><PageHeader title="Dashboard" description="Overview of stock movement and operational activity." /><p className="form-error">{error}</p></div>;

  return (
    <div className="page-container dashboard-page">
      <PageHeader title="Dashboard" description="Overview of stock movement and operational activity." />

      <div className="summary-grid">
        {summaryCards.map((card) => (
          <div className="summary-card" key={card.label}>
            <div className="summary-card-top">
              <span className="summary-card-title">{card.label}</span>
            </div>
            <strong className="summary-card-value">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </strong>
          </div>
        ))}
      </div>

      <div className="dashboard-two-column">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Recent transactions</h2>
          </div>
          {recentTransactions.length === 0 ? <p>No recent transactions.</p> : (
            <div className="transaction-list">
              {recentTransactions.map((entry) => (
                <div className="transaction-item" key={entry.id || `${entry.itemId}-${entry.createdAt}`}>
                  <div className="transaction-main">
                    <strong>{entry.itemName || entry.item || "Item"}</strong>
                    <span className="transaction-reference">{entry.reference}</span>
                  </div>
                  <div className="transaction-meta">
                    <span className={`transaction-type ${getTransactionClassName(entry.type)}`}>{entry.type || "Activity"}</span>
                    <strong>{entry.quantity}</strong>
                    <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>Pending requisitions</h2>
          </div>
          {pendingRequisitions.length === 0 ? <p>No pending requisitions.</p> : (
            <div className="requisition-list">
              {pendingRequisitions.map((entry) => (
                <div className="requisition-item" key={entry.id || entry.reference}>
                  <div>
                    <strong>{entry.reference || entry.name || "Requisition"}</strong>
                    <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
                  </div>
                  <span className="pending-badge">{entry.status || "Pending"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Pending receipts</h2>
          </div>
          {pendingReceipts.length === 0 ? <p>No pending receipts.</p> : (
            <div className="receipt-list">
              {pendingReceipts.map((entry) => (
                <div className="receipt-item" key={entry.id || entry.reference}>
                  <div>
                    <strong>{entry.reference || entry.name || "Receipt"}</strong>
                    <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
                  </div>
                  <span className="pending-badge">{entry.status || "Pending"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>Pending approvals</h2>
          </div>
          {pendingApprovals.length === 0 ? <p>No pending approvals.</p> : (
            <div className="approval-list">
              {pendingApprovals.map((entry) => (
                <div className="approval-item" key={entry.id || entry.reference}>
                  <div>
                    <strong>{entry.reference || entry.name || "Approval"}</strong>
                    <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
                  </div>
                  <span className="pending-badge">{entry.status || "Awaiting review"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-two-column">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Stock movement</h2>
          </div>
          {stockMovement.length === 0 ? <p>No stock movement data.</p> : (
            <div className="transaction-list">
              {stockMovement.map((entry) => (
                <div className="transaction-item" key={entry.id || `${entry.itemId}-${entry.type}-${entry.createdAt}`}>
                  <div className="transaction-main">
                    <strong>{entry.itemName || entry.item || "Item"}</strong>
                  </div>
                  <div className="transaction-meta">
                    <span className={`transaction-type ${getTransactionClassName(entry.direction || entry.type)}`}>{entry.direction || entry.type || "Movement"}</span>
                    <strong>{entry.quantity ?? 0}</strong>
                    <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>Recent activity</h2>
          </div>
          {activity.length === 0 ? <p>No activity available.</p> : (
            <div className="activity-list">
              {activity.map((item) => (
                <div className="activity-item" key={item.id || item.reference || item.message}>
                  <div className="activity-dot"></div>
                  <div>
                    <strong>{item.actor || "System"}</strong>
                    <span>{item.action || "Action"} {item.resource ? `on ${item.resource}` : ""}</span>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Store overview</h2>
        </div>
        {stores.length === 0 ? <p>No store data.</p> : (
          <div className="store-grid">
            {stores.map((store) => (
              <div className="store-card" key={store.id || store.name}>
                <div className="store-card-header">
                  <span className="store-code">STORE</span>
                </div>
                <h3>{store.name}</h3>
                <p>{store.itemCount || 0} items</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Alerts</h2>
        </div>
        {alerts.length === 0 ? <p>No active alerts.</p> : (
          <div className="alert-list">
            {alerts.map((alert) => (
              <div className={`alert-item ${alert.id === 'low-stock-system-alert' ? 'warning' : 'info'}`} key={alert.id || alert.message}>
                <div className="alert-icon">!</div>
                <div className="alert-content">
                  <strong>{alert.title || "Alert"}</strong>
                  <p>{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Reports Summary</h2>
        </div>
        {!reportsSummary || Object.keys(reportsSummary).length === 0 ? <p>No reports summary available.</p> : (
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-card-title">Stock Movements</span>
              <strong className="summary-card-value">{reportsSummary.stockMovements || 0}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Receiving</span>
              <strong className="summary-card-value">{reportsSummary.receiving || 0}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Issues</span>
              <strong className="summary-card-value">{reportsSummary.issues || 0}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Procurements</span>
              <strong className="summary-card-value">{reportsSummary.procurement || 0}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Stock Taking</span>
              <strong className="summary-card-value">{reportsSummary.stockTaking || 0}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Disposals</span>
              <strong className="summary-card-value">{reportsSummary.disposals || 0}</strong>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

export default Dashboard;
