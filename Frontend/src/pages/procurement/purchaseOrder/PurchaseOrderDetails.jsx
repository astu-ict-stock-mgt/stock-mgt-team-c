function PurchaseOrderDetails({
  order,
  onBack,
  onEdit,
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
          ← Back to Purchase Orders
        </button>

        {order.status === "ORDERED" && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onEdit(order)}
          >
            Edit Purchase Order
          </button>
        )}
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{order.number}</h1>
            <p>{order.supplier}</p>
          </div>

          <span className="status-badge">
            {order.status}
          </span>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">
              Supplier
            </span>
            <span className="detail-value">
              {order.supplier}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              Requisition
            </span>
            <span className="detail-value">
              {order.requisition}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              Expected Delivery
            </span>
            <span className="detail-value">
              {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : order.date}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              Amount
            </span>
            <span className="detail-value">
              {Number(
                order.amount
              ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {order.notes && (
          <div className="details-grid" style={{ marginTop: "20px" }}>
            <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
              <span className="detail-label">Notes</span>
              <span className="detail-value">{order.notes}</span>
            </div>
          </div>
        )}

        <h2
          style={{
            margin: "30px 0 18px",
            fontSize: "17px",
          }}
        >
          Ordered Items
        </h2>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Delivered</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.itemCode} - {item.item}
                  </td>
                  <td>{Number(item.quantity)}</td>
                  <td>{Number(item.deliveredQuantity || 0)}</td>
                  <td>
                    {Number(
                      item.unitPrice
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    {(
                      Number(item.quantity) *
                      Number(item.unitPrice)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderDetails;