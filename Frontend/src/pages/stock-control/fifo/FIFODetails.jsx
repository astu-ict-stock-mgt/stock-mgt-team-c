function FIFODetails({
  batch,
  priority,
  onBack,
}) {
  const layerValue =
    batch.quantity *
    batch.unitCost;

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
          ← Back to FIFO Layers
        </button>
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>
              {batch.batch}
            </h1>

            <p>
              FIFO stock layer details.
            </p>
          </div>

          <span className="status-badge">
            Priority {priority}
          </span>
        </div>

        <div className="details-grid">
          {[
            ["Priority", priority],
            ["Batch", batch.batch],
            ["Item", batch.item],
            ["Received", batch.received],
            ["Quantity", batch.quantity],
            [
              "Unit Cost",
              batch.unitCost.toLocaleString(),
            ],
            [
              "Layer Value",
              layerValue.toLocaleString(),
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
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FIFODetails;