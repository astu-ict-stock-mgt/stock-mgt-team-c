import { useState, useEffect } from "react";
import { fetchPaginatedResource } from "../../api/masterData";

function LocationForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const getInitialState = (value) => ({
    code: value?.code ?? "",
    store: value?.storeId ?? value?.store ?? "",
    section: value?.section ?? "",
    shelf: value?.shelfId ?? value?.shelf ?? "",
    bin: value?.bin ?? "",
    status: value?.status ?? "Active",
    description: value?.description ?? "",
  });

  const [formData, setFormData] = useState(getInitialState(initialData));
  const [stores, setStores] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDependencies, setLoadingDependencies] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDependencies() {
      try {
        const [storesRes, shelvesRes] = await Promise.all([
          fetchPaginatedResource("stores", { limit: 100, status: "Active" }),
          fetchPaginatedResource("shelves", { limit: 100, status: "Active" })
        ]);

        if (isMounted) {
          setStores(storesRes.records || []);
          setShelves(shelvesRes.records || []);

          if (!initialData) {
            setFormData(prev => ({
              ...prev,
              store: storesRes.records?.[0]?.id || "",
              shelf: shelvesRes.records?.[0]?.id || "",
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load form dropdown data", err);
        if (isMounted) setErrors(["Failed to load stores and shelves from the server."]);
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
    const section = formData.section?.trim() || "";
    const bin = formData.bin?.trim() || "";

    if (!code) newErrors.push("Location Code is required.");
    if (!formData.store) newErrors.push("Store is required.");
    if (!section) newErrors.push("Section is required.");
    if (!formData.shelf) newErrors.push("Shelf is required.");
    if (!bin) newErrors.push("Bin is required.");

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
      store: formData.store, // UUID
      section: formData.section.trim(),
      shelf: formData.shelf, // UUID
      bin: formData.bin.trim(),
      status: formData.status,
      description: formData.description?.trim() || null,
    };

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSave(payload);
    } catch (err) {
      setErrors([err.message || "An error occurred while saving the location."]);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <strong>Warning:</strong> Inactive locations cannot be used for new material storage.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="location-code">Location Code *</label>
          <input
            id="location-code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="L-001"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location-store">Store *</label>
          <select
            id="location-store"
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

        <div className="form-group">
          <label htmlFor="location-section">Section *</label>
          <input
            id="location-section"
            name="section"
            value={formData.section}
            onChange={handleChange}
            placeholder="A"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location-shelf">Shelf *</label>
          <select
            id="location-shelf"
            name="shelf"
            value={formData.shelf}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          >
            <option value="">-- Select Shelf --</option>
            {shelves.map(s => (
              <option key={s.id} value={s.id}>{s.code}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location-bin">Bin *</label>
          <input
            id="location-bin"
            name="bin"
            value={formData.bin}
            onChange={handleChange}
            placeholder="B01"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location-status">Status *</label>
          <select
            id="location-status"
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
          <label htmlFor="location-description">Description</label>
          <textarea
            id="location-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Location description"
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
          {isSubmitting ? "Saving..." : "Save Location"}
        </button>
      </div>
    </form>
  );
}

export default LocationForm;