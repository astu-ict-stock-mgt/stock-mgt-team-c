function DispatchHistoryDetails({
  dispatch,
  onBack,
}) {
  return (
    <div className="page-container">
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
          ← Back to Dispatch History
        </button>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>
              {dispatch.gatePassNumber}
            </h1>

            <p>
              Dispatch History Details
            </p>
          </div>

          <span className="status-badge">
            {dispatch.status}
          </span>
        </div>

        <div className="details-grid">
          {[
            [
              "Gate Pass",
              dispatch.gatePassNumber,
            ],
            [
              "Issue Reference",
              dispatch.issueVoucherNo,
            ],
            [
              "Date",
              dispatch.dispatchedAt,
            ],
            [
              "Vehicle",
              dispatch.vehicleNumber,
            ],
            [
              "Driver",
              dispatch.driverName,
            ],
            [
              "Destination",
              dispatch.destination,
            ],
            [
              "Security Officer",
              dispatch.securityOfficerName,
            ],
            [
              "Status",
              dispatch.status,
            ],
            [
              "Remarks",
              dispatch.remarks,
            ],
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
      </div>
    </div>
  );
}

export default DispatchHistoryDetails;