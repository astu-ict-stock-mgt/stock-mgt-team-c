import "../../reports/report.css";

function ProcurementReportDetails({
  report,
  onBack,
}) {
  const fromDate = new Date(report.from).toLocaleDateString();
  const toDate = new Date(report.to).toLocaleDateString();

  // Summary Calculation
  const calculateSummary = () => {
    if (report.reportType === "Purchase Requisition Report") {
      const approved = report.rows.filter(r => r.status === "APPROVED" || r.status === "ORDERED" || r.status === "PARTIALLY_RECEIVED" || r.status === "RECEIVED").length;
      const pending = report.rows.filter(r => r.status === "PENDING_APPROVAL" || r.status === "SUBMITTED").length;
      const rejected = report.rows.filter(r => r.status === "REJECTED").length;
      
      return (
        <div className="summary-grid">
          <div className="summary-card"><span>Total Requests</span><strong>{report.count}</strong></div>
          <div className="summary-card"><span>Approved/Processed</span><strong>{approved}</strong></div>
          <div className="summary-card"><span>Pending</span><strong>{pending}</strong></div>
          <div className="summary-card"><span>Rejected</span><strong>{rejected}</strong></div>
        </div>
      );
    }
    
    if (report.reportType === "Purchase Order Report") {
      const totalAmount = report.rows.reduce((sum, r) => sum + Number(r.totalAmount || r.amount || 0), 0);
      const ordered = report.rows.filter(r => r.status === "ORDERED").length;
      const received = report.rows.filter(r => r.status === "RECEIVED" || r.status === "PARTIALLY_RECEIVED").length;
      
      return (
        <div className="summary-grid">
          <div className="summary-card"><span>Total Orders</span><strong>{report.count}</strong></div>
          <div className="summary-card"><span>Total Value</span><strong>${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
          <div className="summary-card"><span>Pending</span><strong>{ordered}</strong></div>
          <div className="summary-card"><span>Received</span><strong>{received}</strong></div>
        </div>
      );
    }
    
    if (report.reportType === "Delivery Report") {
      const inTransit = report.rows.filter(r => r.status === "IN_TRANSIT").length;
      const received = report.rows.filter(r => r.status === "RECEIVED" || r.status === "PARTIALLY_RECEIVED").length;
      
      return (
        <div className="summary-grid">
          <div className="summary-card"><span>Total Deliveries</span><strong>{report.count}</strong></div>
          <div className="summary-card"><span>In Transit</span><strong>{inTransit}</strong></div>
          <div className="summary-card"><span>Received</span><strong>{received}</strong></div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="procurement-report-document master-page reports-workspace">
      <div className="toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "18px", gap: "12px" }}>
        <button type="button" className="secondary-button" onClick={onBack}>
          ← Back to Procurement Reports
        </button>
        <button type="button" className="primary-button" onClick={() => window.print()}>
          Print Report
        </button>
      </div>

      <div className="details-card">
        <div className="report-details-header">
          <div>
            <h1>{report.reportType}</h1>
            <p>{fromDate} → {toDate}</p>
          </div>
          <span className="status-badge">REPORT</span>
        </div>

        {calculateSummary()}

        <div className="details-grid" style={{ marginBottom: "20px" }}>
          <div className="detail-item"><span className="detail-label">Report Type</span><span className="detail-value">{report.reportType}</span></div>
          <div className="detail-item"><span className="detail-label">From</span><span className="detail-value">{fromDate}</span></div>
          <div className="detail-item"><span className="detail-label">To</span><span className="detail-value">{toDate}</span></div>
        </div>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
          <h2>Report Information</h2>
          <div className="data-table-wrapper" style={{ marginTop: "16px" }}>
            <table className="data-table">
              
              {report.reportType === "Purchase Requisition Report" && (
                <>
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Requester</th>
                      <th>Department</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map(row => (
                      <tr key={row.id}>
                        <td>{row.requestNumber || row.number || row.id}</td>
                        <td>{row.requester?.fullName || row.requester || "System"}</td>
                        <td>{row.department?.name || row.department || "N/A"}</td>
                        <td>{new Date(row.createdAt || row.date).toLocaleDateString()}</td>
                        <td><span className="status-badge">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {report.reportType === "Purchase Order Report" && (
                <>
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Supplier</th>
                      <th>Requisition</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map(row => (
                      <tr key={row.id}>
                        <td>{row.orderNumber || row.number || row.id}</td>
                        <td>{row.supplier?.name || row.supplier || "N/A"}</td>
                        <td>{row.requisition?.requestNumber || row.requisitionId || "N/A"}</td>
                        <td>{new Date(row.orderDate || row.date).toLocaleDateString()}</td>
                        <td>{Number(row.totalAmount || row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td><span className="status-badge">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {report.reportType === "Delivery Report" && (
                <>
                  <thead>
                    <tr>
                      <th>Delivery #</th>
                      <th>Purchase Order</th>
                      <th>Supplier</th>
                      <th>Expected</th>
                      <th>Actual</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map(row => (
                      <tr key={row.id}>
                        <td>{row.deliveryNumber || row.id}</td>
                        <td>{row.purchaseOrder?.orderNumber || row.purchaseOrderId || "N/A"}</td>
                        <td>{row.supplier?.name || row.supplier || "N/A"}</td>
                        <td>{row.expectedDate ? new Date(row.expectedDate).toLocaleDateString() : "—"}</td>
                        <td>{row.actualDate ? new Date(row.actualDate).toLocaleDateString() : "—"}</td>
                        <td><span className="status-badge">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

            </table>
            
            {report.rows.length === 0 && (
              <div style={{ padding: "20px", textAlign: "center", fontStyle: "italic", color: "#666" }}>
                No records found matching the report parameters.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProcurementReportDetails;