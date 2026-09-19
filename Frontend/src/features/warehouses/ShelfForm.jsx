import { useState, useEffect } from "react";
import { fetchPaginatedResource } from "../../api/masterData";

function ShelfForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    warehouse: value?.warehouseId ?? "",
    section: value?.section ?? "",
    description: value?.description ?? "",
    status: value?.status ?? "Active",
  });

  const [formData, setFormData] = useState(getInitialState(initialData));
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Warehouse dropdown data
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseError, setWarehouseError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadWarehouses() {
      setLoadingWarehouses(true);
      setWarehouseError("");
      try {
        const { records } = await fetchPaginatedResource("warehouses", { status: "Active", limit: 100 });
        if (isMounted) {
          setWarehouses(records);
          if (records.length === 0) {
            setWarehouseError("No active warehouses available. You must create one first.");
          }
        }
      } catch (e) {
        console.error("Failed to load warehouses", e);
        if (isMounted) {
          setWarehouseError("Failed to load warehouses.");
        }
      } finally {
        if (isMounted) setLoadingWarehouses(false);
      }
    }
    loadWarehouses();
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
    const warehouse = formData.warehouse?.trim() || "";

    if (!code) newErrors.push("Shelf Code is required.");
    if (!name) newErrors.push("Shelf Name is required.");
    if (!warehouse) newErrors.push("Warehouse is required.");
    if (formData.status !== "Active" && formData.status !== "Inactive") {
      newErrors.push("Status must be Active or Inactive.");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm() || warehouses.length === 0) {
      return;
    }

    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      warehouse: formData.warehouse.trim(),
      section: formData.section?.trim() || null,
      description: formData.description?.trim() || null,
      status: formData.status,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the shelf."]);
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

      {warehouseError && (
        <div className="form-error" style={{ color: 'red', marginBottom: '1.5rem', background: '#ffebee', padding: '1rem', borderRadius: '4px' }}>
          {warehouseError}
        </div>
      )}

      {formData.status === "Inactive" && (
        <div style={{ padding: "10px", background: "#fff3cd", color: "#856404", borderRadius: "4px", marginBottom: "1rem" }}>
          <strong>Warning:</strong> Inactive shelves may not be used for new operations.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="shelf-code">Shelf Code *</label>
          <input
            id="shelf-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="SH-A01"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="shelf-name">Shelf Name *</label>
          <input
            id="shelf-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Shelf A01"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="shelf-warehouse">Warehouse *</label>
          <select
            id="shelf-warehouse"
            name="warehouse"
            value={formData.warehouse}
            onChange={handleChange}
            disabled={isSubmitting || loadingWarehouses || warehouses.length === 0}
            required
          >
            <option value="">{loadingWarehouses ? "Loading warehouses..." : "Select Warehouse"}</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="shelf-section">Section</label>
          <input
            id="shelf-section"
            name="section"
            value={formData.section}
            onChange={handleChange}
            placeholder="A"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="shelf-status">Status</label>
          <select
            id="shelf-status"
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
          <label htmlFor="shelf-description">Description</label>
          <textarea
            id="shelf-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Shelf description"
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
          disabled={isSubmitting || warehouses.length === 0 || loadingWarehouses}
        >
          {isSubmitting ? "Saving..." : "Save Shelf"}
        </button>
      </div>
    </form>
  );
}

export default ShelfForm;