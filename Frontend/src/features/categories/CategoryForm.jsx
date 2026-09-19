import { useState } from "react";

function CategoryForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    storeType: value?.storeType ?? "Main",
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
    setErrors([]);
  };

  const validateForm = () => {
    const newErrors = [];
    const code = formData.code?.trim() || "";
    const name = formData.name?.trim() || "";

    if (!code) newErrors.push("Category Code is required.");
    if (!name) newErrors.push("Category Name is required.");
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
      storeType: formData.storeType || "Main",
      description: formData.description?.trim() || null,
      status: formData.status,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the category."]);
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
          <strong>Warning:</strong> Inactive categories will not be available for new items.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="category-code">Category Code *</label>
          <input
            id="category-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="CAT01"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category-name">Category Name *</label>
          <input
            id="category-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Category name"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category-storeType">Store Type *</label>
          <select
            id="category-storeType"
            name="storeType"
            value={formData.storeType}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="Main">Main</option>
            <option value="Department">Department</option>
            <option value="Cafe">Cafe</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="category-status">Status *</label>
          <select
            id="category-status"
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
          <label htmlFor="category-description">Description</label>
          <textarea
            id="category-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Category description"
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
          {isSubmitting ? "Saving..." : "Save Category"}
        </button>
      </div>
    </form>
  );
}

export default CategoryForm;