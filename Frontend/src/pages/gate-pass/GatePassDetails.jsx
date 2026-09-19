function GatePassDetails({
  pass,
  onBack,
  onVerify,
}) {
  return (
    <div className="master-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back to Gate Passes
        </button>

          {pass.status === "CREATED" && (
            <button
              type="button"
              className="primary-button"
              onClick={() => onVerify(pass)}
            >
              Verify Gate Pass
            </button>
          )}
        </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{pass.gatePassNumber}</h1>
            <p>{pass.issueVoucherNo}</p>
          </div>

          <span className="status-badge">
            {pass.status}
          </span>
        </div>

        <div className="details-grid">
          {[
            ["Gate Pass", pass.gatePassNumber],
            [
              "Issue Reference",
              pass.issueVoucherNo,
            ],
            ["Vehicle", pass.vehicleNumber],
            ["Driver", pass.driverName],
            ["Destination", pass.destination],
            ["Date", pass.createdAt],
            ["Status", pass.status],
            ["Remarks", pass.remarks],
          ].map(([label, value]) => (
            <div
              className="detail-item"
              key={label}
            >
              <span className="detail-label">
                {label}
              </span>

              <span className="detail-value">
                {value || "Not provided"}
              </span>
            </div>
          ))}
        </div>
        
        {pass.items && pass.items.length > 0 && (
          <div className="items-section" style={{ marginTop: "32px" }}>
            <h3>Authorized Items</h3>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {pass.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>{item.itemCode || "-"}</td>
                      <td>{item.itemName || "-"}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GatePassDetails;