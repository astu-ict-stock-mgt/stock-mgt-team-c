import { useState } from "react";
import "../StockPage.css";

function StockCardForm({
  item,
  onCancel,
  onSubmit,
}) {
  const [formData, setFormData] =
    useState({
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      unit: item?.unit || "",
      store: item?.store || "Main Store",
      location: item?.location || "",
      openingBalance:
        item?.openingBalance ?? 0,
      receipts: item?.receipts ?? 0,
      issues: item?.issues ?? 0,
      returns: item?.returns ?? 0,
      transfersIn:
        item?.transfersIn ?? 0,
      transfersOut:
        item?.transfersOut ?? 0,
      reorder: item?.reorder ?? 0,
      status: item?.status || "Available",
    });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit(formData);
  };

  return (
    <div className="stock-page">

      <div className="stock-page-header">

        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            ← Back to Stock Cards
          </button>

          <h1>
            {item
              ? "Edit Stock Card"
              : "Add Stock Card"}
          </h1>

          <p>
            {item
              ? "Update stock card information."
              : "Create a new stock card record."}
          </p>
        </div>

      </div>

      <form
        className="form-card"
        onSubmit={handleSubmit}
      >

        <div className="form-grid">

          <div className="form-group">
            <label>Item Code</label>

            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Item Name</label>

            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Unit</label>

            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Store</label>

            <select
              name="store"
              value={formData.store}
              onChange={handleChange}
            >
              <option>Main Store</option>
              <option>IT Store</option>
              <option>Cafe Store</option>
            </select>
          </div>

          <div className="form-group">
            <label>Location</label>

            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Status</label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option>Available</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
              <option>Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label>Opening Balance</label>

            <input
              type="number"
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Receipts</label>

            <input
              type="number"
              name="receipts"
              value={formData.receipts}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Issues</label>

            <input
              type="number"
              name="issues"
              value={formData.issues}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Returns</label>

            <input
              type="number"
              name="returns"
              value={formData.returns}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Transfers In</label>

            <input
              type="number"
              name="transfersIn"
              value={formData.transfersIn}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Transfers Out</label>

            <input
              type="number"
              name="transfersOut"
              value={formData.transfersOut}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Reorder Level</label>

            <input
              type="number"
              name="reorder"
              value={formData.reorder}
              onChange={handleChange}
              min="0"
            />
          </div>

        </div>

        <div className="form-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
          >
            {item
              ? "Save Changes"
              : "Add Stock Card"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default StockCardForm;