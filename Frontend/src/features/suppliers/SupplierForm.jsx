import { useState } from "react";

function SupplierForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    contact: value?.contact ?? "",
    phone: value?.phone ?? "",
    email: value?.email ?? "",
    address: value?.address ?? "",
    status: value?.status ?? "Active",
    description: value?.description ?? "",
  });

  const [formData, setFormData] = useState(getInitialState(initialData));
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setErrors([]);
  };

  const validateForm = () => {
    const newErrors = [];
    const code = formData.code?.trim() || "";
    const name = formData.name?.trim() || "";
    const email = formData.email?.trim() || "";

    if (!code) newErrors.push("Supplier Code is required.");
    if (!name) newErrors.push("Supplier Name is required.");

    // Optional Email validation using a basic regex
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.push("Please enter a valid email address.");
      }
    }

    if (formData.status !== "Active" && formData.status !== "Inactive") {
      newErrors.push("Status must be Active or Inactive.");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      contact: formData.contact?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      status: formData.status,
      description: formData.description?.trim() || null,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the supplier."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="form-error" style={{ color: 'red', marginBottom: '1.5rem', background: '#ffebee', padding: '1rem', borderRadius: '4px' }}>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {formData.status === "Inactive" && (
        <div style={{ padding: "10px", background: "#fff3cd", color: "#856404", borderRadius: "4px", marginBottom: "1rem" }}>
          <strong>Warning:</strong> Inactive suppliers will not be available for new transactions (like POs or GRNs).
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="supplier-code">Supplier Code *</label>
          <input
            id="supplier-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="SUP-001"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="supplier-name">Supplier Name *</label>
          <input
            id="supplier-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Supplier name"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="supplier-contact">Contact Person</label>
          <input
            id="supplier-contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="Contact person"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="supplier-phone">Phone</label>
          <input
            id="supplier-phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+251..."
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="supplier-email">Email</label>
          <input
            id="supplier-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="supplier@example.com"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="supplier-status">Status *</label>
          <select
            id="supplier-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="supplier-address">Address</label>
          <input
            id="supplier-address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Supplier address"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="supplier-description">Description</label>
          <textarea
            id="supplier-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Supplier description"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="danger-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Supplier"}
        </button>
      </div>
    </form>
  );
}

export default SupplierForm;