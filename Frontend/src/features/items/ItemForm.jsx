import { useState, useEffect } from "react";
import { fetchPaginatedResource } from "../../api/masterData";

function ItemForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    name: value?.name ?? "",
    category: value?.categoryId ?? value?.category ?? "",
    type: value?.type ?? "Consumable",
    unit: value?.unitId ?? value?.unit ?? "",
    store: value?.storeId ?? value?.store ?? "",
    location: value?.locationId ?? value?.location ?? "",
    minimum: Number(value?.minimum ?? 0),
    maximum: Number(value?.maximum ?? 0),
    reorder: Number(value?.reorder ?? 0),
    status: value?.status ?? "Active",
    description: value?.description ?? "",
  });

  const [formData, setFormData] = useState(getInitialState(initialData));
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [stores, setStores] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loadingDependencies, setLoadingDependencies] = useState(true);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDependencies() {
      try {
        const [catsRes, unitsRes, storesRes, locsRes] = await Promise.all([
          fetchPaginatedResource("categories", { limit: 100, status: "Active" }),
          fetchPaginatedResource("units", { limit: 100, status: "Active" }),
          fetchPaginatedResource("stores", { limit: 100, status: "Active" }),
          fetchPaginatedResource("locations", { limit: 100, status: "Active" })
        ]);

        if (isMounted) {
          setCategories(catsRes.records || []);
          setUnits(unitsRes.records || []);
          setStores(storesRes.records || []);
          setLocations(locsRes.records || []);

          // Auto-select first if none selected and it's a new item
          if (!initialData) {
            setFormData(prev => ({
              ...prev,
              category: catsRes.records?.[0]?.id || "",
              unit: unitsRes.records?.[0]?.id || "",
              store: storesRes.records?.[0]?.id || "",
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load dependencies", err);
        if (isMounted) setErrors(["Failed to load form dropdown data from the server."]);
      } finally {
        if (isMounted) setLoadingDependencies(false);
      }
    }
    loadDependencies();
    return () => { isMounted = false; };
  }, [initialData]);

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
    const min = Number(formData.minimum);
    const max = Number(formData.maximum);
    const reorder = Number(formData.reorder);

    if (!code) newErrors.push("Item Code is required.");
    if (!name) newErrors.push("Item Name is required.");
    if (!formData.category) newErrors.push("Category is required.");
    if (!formData.unit) newErrors.push("Unit is required.");
    if (!formData.store) newErrors.push("Store is required.");

    if (min < 0) newErrors.push("Minimum stock cannot be negative.");
    if (max < 0) newErrors.push("Maximum stock cannot be negative.");
    if (reorder < 0) newErrors.push("Reorder level cannot be negative.");
    if (max < min) newErrors.push("Maximum stock must be greater than or equal to minimum stock.");
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
      category: formData.category, // UUID
      type: formData.type || "Consumable",
      unit: formData.unit, // UUID
      store: formData.store, // UUID
      location: formData.location || null, // UUID
      minimum: Number(formData.minimum),
      maximum: Number(formData.maximum),
      reorder: Number(formData.reorder),
      status: formData.status,
      description: formData.description?.trim() || null,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the item."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter locations by selected store
  const availableLocations = locations.filter(loc => loc.storeId === formData.store || !formData.store);

  if (loadingDependencies) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading form data...</div>;
  }

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
          <strong>Warning:</strong> Inactive items will not be available for new transactions.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="item-code">Item Code *</label>
          <input
            id="item-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="ITM-0001"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-name">Item Name *</label>
          <input
            id="item-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Item name"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-category">Category *</label>
          <select
            id="item-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="">-- Select Category --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="item-type">Item Type *</label>
          <select
            id="item-type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="Consumable">Consumable</option>
            <option value="Non-Consumable">Non-Consumable</option>
            <option value="Fixed Asset">Fixed Asset</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="item-unit">Unit *</label>
          <select
            id="item-unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="">-- Select Unit --</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="item-store">Store *</label>
          <select
            id="item-store"
            name="store"
            value={formData.store}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="">-- Select Store --</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="item-location">Location</label>
          <select
            id="item-location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="">-- Select Location --</option>
            {availableLocations.map(l => (
              <option key={l.id} value={l.id}>{l.code}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="item-minimum">Minimum Stock</label>
          <input
            id="item-minimum"
            type="number"
            min="0"
            name="minimum"
            value={formData.minimum}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-maximum">Maximum Stock</label>
          <input
            id="item-maximum"
            type="number"
            min="0"
            name="maximum"
            value={formData.maximum}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-reorder">Reorder Level</label>
          <input
            id="item-reorder"
            type="number"
            min="0"
            name="reorder"
            value={formData.reorder}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="item-status">Status</label>
          <select
            id="item-status"
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
          <label htmlFor="item-description">Description</label>
          <textarea
            id="item-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Item description"
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
          {isSubmitting ? "Saving..." : "Save Item"}
        </button>
      </div>
    </form>
  );
}

export default ItemForm;