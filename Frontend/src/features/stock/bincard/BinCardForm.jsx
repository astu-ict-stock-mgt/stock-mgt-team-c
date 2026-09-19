import { useState } from "react";
import "../StockPage.css";

function BinCardForm({
  bin,
  onCancel,
  onSubmit,
}) {
  const [formData, setFormData] =
    useState({
      binCode: bin?.binCode || "",
      itemCode: bin?.itemCode || "",
      itemName: bin?.itemName || "",
      store: bin?.store || "Main Store",
      section: bin?.section || "",
      shelf: bin?.shelf || "",
      openingQty: bin?.openingQty ?? 0,
      inbound: bin?.inbound ?? 0,
      outbound: bin?.outbound ?? 0,
      balance: bin?.balance ?? 0,
      status: bin?.status || "Active",
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
            ← Back to Bin Cards
          </button>

          <h1>
            {bin
              ? "Edit Bin Card"
              : "Add Bin Card"}
          </h1>

          <p>
            {bin
              ? "Update storage-bin information."
              : "Create a new storage-bin card."}
          </p>

        </div>

      </div>

      <form
        className="form-card"
        onSubmit={handleSubmit}
      >

        <div className="form-grid">

          <div className="form-group">
            <label>Bin Code</label>

            <input
              type="text"
              name="binCode"
              value={formData.binCode}
              onChange={handleChange}
              required
            />
          </div>

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
            <label>Section</label>

            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Shelf</label>

            <input
              type="text"
              name="shelf"
              value={formData.shelf}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Opening Quantity</label>

            <input
              type="number"
              name="openingQty"
              value={formData.openingQty}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Inbound</label>

            <input
              type="number"
              name="inbound"
              value={formData.inbound}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Outbound</label>

            <input
              type="number"
              name="outbound"
              value={formData.outbound}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Current Balance</label>

            <input
              type="number"
              name="balance"
              value={formData.balance}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Status</label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option>Active</option>
              <option>Inactive</option>
              <option>Full</option>
              <option>Empty</option>
            </select>
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
            {bin
              ? "Save Changes"
              : "Add Bin Card"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default BinCardForm;