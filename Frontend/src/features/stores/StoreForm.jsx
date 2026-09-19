import { useState, useEffect } from "react";
import { fetchPaginatedResource } from "../../api/masterData";

function StoreForm({ initialData = null, onSave, onCancel }) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    type: value?.type ?? "Main",
    // We pass the actual ID of the department to the backend.
    // In initialData, departmentRef holds the object if it exists.
    department: value?.departmentRef?.id ?? value?.department ?? "",
    location: value?.location ?? "",
    description: value?.description ?? "",
    status: value?.status ?? "Active",
  });

  const [formData, setFormData] = useState(getInitialState(initialData));
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Department dropdown data
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDepartments() {
      setLoadingDepartments(true);
      try {
        // Fetch up to 1000 active departments to populate the dropdown
        const { records } = await fetchPaginatedResource("departments", { status: "Active", limit: 100 });
        if (isMounted) setDepartments(records);
      } catch (e) {
        console.error("Failed to load departments", e);
      } finally {
        if (isMounted) setLoadingDepartments(false);
      }
    }
    loadDepartments();
    return () => { isMounted = false; };
  }, []);

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
    const type = formData.type?.trim() || "";

    if (!code) newErrors.push("Store Code is required.");
    if (!name) newErrors.push("Store Name is required.");
    if (!type) newErrors.push("Store Type is required.");
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

    const cleanedData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: formData.type.trim(),
      department: formData.department || null,
      location: formData.location?.trim() || null,
      description: formData.description?.trim() || null,
      status: formData.status,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(cleanedData);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the store."]);
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

      {/* INACTIVE WARNING */}
      {formData.status === "Inactive" && (
        <div style={{ padding: "10px", background: "#fff3cd", color: "#856404", borderRadius: "4px", marginBottom: "1rem" }}>
          <strong>Warning:</strong> Inactive stores cannot be used for normal stock operations.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="store-code">Store Code *</label>
          <input
            id="store-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g. MS-01"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="store-name">Store Name *</label>
          <input
            id="store-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Store name"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="store-type">Store Type *</label>
          <select
            id="store-type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="Main">Main Store</option>
            <option value="Department">Department Store</option>
            <option value="Cafe">Cafe Store</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="store-department">Department</label>
          <select
            id="store-department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            disabled={isSubmitting || loadingDepartments}
          >
            <option value="">{loadingDepartments ? "Loading departments..." : "None"}</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="store-location">Location</label>
          <input
            id="store-location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Building A, Floor 1"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="store-status">Status</label>
          <select
            id="store-status"
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
          <label htmlFor="store-description">Description</label>
          <textarea
            id="store-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Store description (optional)"
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
          {isSubmitting ? "Saving..." : "Save Store"}
        </button>
      </div>
    </form>
  );
}

export default StoreForm;