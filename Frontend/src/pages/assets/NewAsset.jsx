import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./assets.css";

function NewAsset() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    assetCode: "",
    itemId: "",
    serialNumber: "",
    acquisitionDate: "",
    acquisitionValue: "",
    currentLocationId: "",
    classification: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const payload = {
        itemId: form.itemId,
        serialNumber: form.serialNumber || null,
        classification: form.classification || "",
        description: form.description || "",
        acquisitionDate: form.acquisitionDate || null,
        acquisitionValue: form.acquisitionValue ? Number(form.acquisitionValue) : null,
        currentLocationId: form.currentLocationId || null,
      };

      const resp = await (await import("../../api/client")).apiRequest(`/assets`, { method: "POST", body: payload });
      const created = resp?.data?.asset || resp?.data || null;
      if (created && created.id) {
        navigate(`/assets/${created.id}`);
      } else {
        alert("Asset created but response is missing asset id.");
        navigate("/assets");
      }
    } catch (err) {
      console.error("Failed to create asset:", err);
      alert(err?.message || "Unable to create asset.");
    }
  }

  return (
    <div className="module-page">

      <div className="page-header">

        <div>

          <h1>Register Fixed Asset</h1>

          <p>
            Create a fixed asset registration record.
          </p>

        </div>

      </div>

      <form onSubmit={handleSubmit}>

        <div className="form-card">

          <h2>Asset Information</h2>

          <div className="form-grid">

            <div className="form-group">
              <label>Asset Code</label>

              <input
                name="assetCode"
                value={form.assetCode}
                onChange={handleChange}
                placeholder="FA-0001"
                required
              />

            </div>

            <div className="form-group">

              <label>Item</label>

              <input
                name="item"
                value={form.item}
                onChange={handleChange}
                placeholder="Dell Laptop"
                required
              />

            </div>

            <div className="form-group">

              <label>Serial Number</label>

              <input
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label>Acquisition Date</label>

              <input
                type="date"
                name="acquisitionDate"
                value={form.acquisitionDate}
                onChange={handleChange}
                required
              />

            </div>

            <div className="form-group">

              <label>Value</label>

              <input
                type="number"
                name="value"
                value={form.value}
                onChange={handleChange}
                placeholder="0.00"
                required
              />

            </div>

            <div className="form-group">

              <label>Location</label>

              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="IT Store / Shelf / Bin"
                required
              />

            </div>

            <div className="form-group">

              <label>Custodian</label>

              <input
                name="custodian"
                value={form.custodian}
                onChange={handleChange}
                placeholder="User or Department"
              />

            </div>

            <div className="form-group">

              <label>Condition</label>

              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
              >
                <option>New</option>
                <option>Good</option>
                <option>Damaged</option>
                <option>Under Maintenance</option>
              </select>

            </div>

            <div className="form-group">

              <label>Status</label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option>Available</option>
                <option>Assigned</option>
                <option>Maintenance</option>
                <option>Disposed</option>
              </select>

            </div>

            <div className="form-group">

              <label>Supporting Document</label>

              <input
                type="file"
                name="document"
                onChange={(e) =>
                  setForm({
                    ...form,
                    document: e.target.files[0]?.name || "",
                  })
                }
              />

            </div>

          </div>

        </div>

        <div className="form-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/assets")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
          >
            Register Asset
          </button>

        </div>

      </form>

    </div>
  );
}

export default NewAsset;