function DeliveryDetails({
  delivery,
  onBack,
  onEdit,
}) {
  return (
    <div className="master-page">

      {/* TOP ACTIONS */}

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
          ← Back to Deliveries
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            onEdit(delivery)
          }
        >
          Edit Delivery
        </button>

      </div>

      {/* DETAILS CARD */}

      <div className="details-card">

        <div className="page-header">

          <div>
            <h1>
              {delivery.deliveryNumber || delivery.id}
            </h1>

            <p>
              Purchase Order: {delivery.po}
            </p>
          </div>

          <span className="status-badge">
            {delivery.status}
          </span>

        </div>

        {/* DETAILS GRID */}

        <div className="details-grid">

          {/* DELIVERY ID */}

          <div className="detail-item">
            <span className="detail-label">
              Delivery ID
            </span>

            <span className="detail-value">
              {delivery.deliveryNumber || delivery.id}
            </span>
          </div>

          {/* PURCHASE ORDER */}

          <div className="detail-item">
            <span className="detail-label">
              Purchase Order
            </span>

            <span className="detail-value">
              {delivery.po}
            </span>
          </div>

          {/* SUPPLIER */}

          <div className="detail-item">
            <span className="detail-label">
              Supplier
            </span>

            <span className="detail-value">
              {delivery.supplier}
            </span>
          </div>

          {/* EXPECTED DATE */}

          <div className="detail-item">
            <span className="detail-label">
              Expected Delivery
            </span>

            <span className="detail-value">
              {delivery.expected ? new Date(delivery.expected).toLocaleDateString() : "—"}
            </span>
          </div>

          {/* ACTUAL DATE */}

          <div className="detail-item">
            <span className="detail-label">
              Actual Delivery
            </span>

            <span className="detail-value">
              {delivery.actual ? new Date(delivery.actual).toLocaleDateString() : "—"}
            </span>
          </div>

          {/* STATUS */}

          <div className="detail-item">
            <span className="detail-label">
              Status
            </span>

            <span className="detail-value">
              {delivery.status}
            </span>
          </div>

          {/* NOTES */}

          <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
            <span className="detail-label">
              Notes
            </span>

            <span className="detail-value">
              {delivery.notes ||
                "No notes provided."}
            </span>
          </div>

        </div>

        <h2 style={{ margin: "30px 0 18px", fontSize: "17px" }}>
          Delivered Items
        </h2>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity Received</th>
              </tr>
            </thead>

            <tbody>
              {delivery.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.itemCode || "Code"} - {item.itemName || item.item || "Item"}
                  </td>
                  <td>{Number(item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}

export default DeliveryDetails;