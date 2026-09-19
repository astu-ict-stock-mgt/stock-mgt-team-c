import { useState } from "react";

function UnitForm({ initialData = null, onSave, onCancel }) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    description: value?.description ?? "",
    status: value?.status ?? "Active",
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
    // Clear errors as soon as the user starts editing
    setErrors([]);
  };

  const validateForm = () => {
    const newErrors = [];
    const code = formData.code?.trim() || "";
    const name = formData.name?.trim() || "";

    if (!code) newErrors.push("Unit Code is required.");
    if (!name) newErrors.push("Unit Name is required.");
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
      description: formData.description?.trim() || null,
      status: formData.status,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the unit."]);
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

      <div className="form-grid">
        <div className="form-group">
          <label>Unit Code *</label>
          <input
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g. KG"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label>Unit Name *</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Kilograms"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Unit description (optional)"
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
          {isSubmitting ? "Saving..." : "Save Unit"}
        </button>
      </div>
    </form>
  );
}

export default UnitForm;