import { useState, useEffect } from "react";
import { fetchIssueVouchers } from "../../api/issuing";

function GatePassForm({
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    issueVoucherId: "",
    vehicleNumber: "",
    driverName: "",
    destination: "",
    purpose: "",
  });

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssueVouchers({ limit: 100 }).then((data) => {
      // Filter vouchers that are ISSUED or COMPLETED (or APPROVED)
      // The backend says "Gate pass can only be created for an approved issue." and checks if issue is ISSUED or APPROVED
      // However, we just show all valid ones here and let user select
      setVouchers(data?.data || data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !formData.issueVoucherId ||
      !formData.vehicleNumber.trim() ||
      !formData.driverName.trim()
    ) {
      return;
    }

    // Pass directly the expected payload
    onSave({
      issueVoucherId: formData.issueVoucherId,
      vehicleNumber: formData.vehicleNumber,
      driverName: formData.driverName,
      destination: formData.destination,
      purpose: formData.purpose
    });
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Issue Voucher *</label>
          <select
            name="issueVoucherId"
            value={formData.issueVoucherId}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">-- Select Issue Voucher --</option>
            {vouchers.map(v => (
              <option key={v.id} value={v.id}>
                {v.voucherNo} ({v.type})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Vehicle Number *</label>
          <input
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            placeholder="e.g. AA-12345"
            required
          />
        </div>

        <div className="form-group">
          <label>Driver Name *</label>
          <input
            name="driverName"
            value={formData.driverName}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            required
          />
        </div>

        <div className="form-group">
          <label>Destination</label>
          <input
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="Destination"
          />
        </div>

        <div className="form-group full-width">
          <label>Purpose</label>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            placeholder="Purpose of exit"
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="danger-button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="primary-button"
          disabled={loading}
        >
          Create Gate Pass
        </button>
      </div>
    </form>
  );
}

export default GatePassForm;