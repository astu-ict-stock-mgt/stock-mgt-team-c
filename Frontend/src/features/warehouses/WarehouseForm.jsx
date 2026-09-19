import { useState, useEffect } from "react";
import { fetchPaginatedResource } from "../../api/masterData";

function WarehouseForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    type: value?.type ?? "Central",
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

  // Standard warehouse types
  const defaultTypes = ["Central", "Secondary", "Temporary"];
  const typeOptions = [...defaultTypes];

  // If the existing type is not in the default list, add it so the select doesn't break
  if (initialData?.type && !defaultTypes.includes(initialData.type)) {
    typeOptions.push(initialData.type);
  }

  useEffect(() => {
    let isMounted = true;
    async function loadDepartments() {
      setLoadingDepartments(true);
      try {
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

    if (!code) newErrors.push("Warehouse Code is required.");
    if (!name) newErrors.push("Warehouse Name is required.");
    if (!type) newErrors.push("Warehouse Type is required.");
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
      type: formData.type.trim(),
      department: formData.department || null,
      location: formData.location?.trim() || null,
      description: formData.description?.trim() || null,
      status: formData.status,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the warehouse."]);
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
          <strong>Warning:</strong> Inactive warehouses may not be used for new operations.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="warehouse-code">Warehouse Code *</label>
          <input
            id="warehouse-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="WH-001"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="warehouse-name">Warehouse Name *</label>
          <input
            id="warehouse-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Main Warehouse"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="warehouse-type">Warehouse Type *</label>
          <select
            id="warehouse-type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="warehouse-department">Department</label>
          <select
            id="warehouse-department"
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
          <label htmlFor="warehouse-location">Location</label>
          <input
            id="warehouse-location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Warehouse location"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="warehouse-status">Status</label>
          <select
            id="warehouse-status"
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
          <label htmlFor="warehouse-description">Description</label>
          <textarea
            id="warehouse-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Warehouse description"
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
          {isSubmitting ? "Saving..." : "Save Warehouse"}
        </button>
      </div>
    </form>
  );
}

export default WarehouseForm;