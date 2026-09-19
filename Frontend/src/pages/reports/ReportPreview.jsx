function ReportPreview({
  reportType,
  filters,
  rows,
}) {
  const totalQuantity = rows.reduce(
    (total, row) =>
      total + row.quantity,
    0
  );

  const totalValue = rows.reduce(
    (total, row) =>
      total + row.value,
    0
  );

  return (
    <div className="report-document">

      {/* =====================================================
          DOCUMENT HEADER
      ===================================================== */}

      <div className="report-document-header">

        <div>
          <h1>
            Material Stock Management System
          </h1>

          <p>
            Inventory & Stock Management
          </p>
        </div>

        <div className="report-document-title">
          <span>
            REPORT
          </span>

          <strong>
            {reportType.name}
          </strong>
        </div>

      </div>

      {/* =====================================================
          FILTER INFORMATION
      ===================================================== */}

      <div className="report-meta">

        <div>
          <span>From</span>

          <strong>
            {filters.from || "All dates"}
          </strong>
        </div>

        <div>
          <span>To</span>

          <strong>
            {filters.to || "All dates"}
          </strong>
        </div>

        <div>
          <span>Store</span>

          <strong>
            {filters.store}
          </strong>
        </div>

        <div>
          <span>Category</span>

          <strong>
            {filters.category}
          </strong>
        </div>

      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="report-document-summary">

        <div>
          <span>Total Records</span>

          <strong>
            {rows.length}
          </strong>
        </div>

        <div>
          <span>Total Quantity</span>

          <strong>
            {totalQuantity}
          </strong>
        </div>

        <div>
          <span>Total Value</span>

          <strong>
            {totalValue.toLocaleString()}
          </strong>
        </div>

      </div>

      {/* =====================================================
          DATA TABLE
      ===================================================== */}

      <div className="report-document-table">

        <table>

          <thead>
            <tr>
              <th>#</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Item</th>
              <th>Category</th>
              <th>Store</th>
              <th>Qty</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  className="report-empty"
                >
                  No records match the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.reference}>

                  <td>
                    {index + 1}
                  </td>

                  <td>
                    {row.reference}
                  </td>

                  <td>
                    {row.date}
                  </td>

                  <td>
                    {row.item}
                  </td>

                  <td>
                    {row.category}
                  </td>

                  <td>
                    {row.store}
                  </td>

                  <td>
                    {row.quantity}
                  </td>

                  <td>
                    {row.value.toLocaleString()}
                  </td>

                  <td>
                    <span className="report-status-badge">
                      {row.status}
                    </span>
                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="report-document-footer">

        <span>
          Material Stock Management System
        </span>

        <span>
          Confidential — Internal Use Only
        </span>

      </div>

    </div>
  );
}

export default ReportPreview;