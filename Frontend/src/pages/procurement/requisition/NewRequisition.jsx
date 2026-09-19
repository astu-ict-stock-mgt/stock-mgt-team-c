import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchResource } from "../../../api/masterData";
import {
  createRequisition,
  fetchRequisitionById,
  mapRequisitionFormPayload,
  updateRequisition,
} from "../../../api/requisition";
import AuthContext from "../../../context/AuthContext";

import "./requisitions.css";

const emptyForm = {
  departmentId: "",
  storeId: "",
  purpose: "",
  requiredDate: "",
  remarks: "",
};

const emptyItem = {
  itemId: "",
  locationId: "",
  requestedQty: 1,
  remarks: "",
};

function NewRequisition() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useContext(AuthContext);
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadFormData() {
      setLoading(true);
      setError("");

      try {
        const [departmentData, storeData, itemData, locationData] = await Promise.all([
          fetchResource("departments"),
          fetchResource("stores"),
          fetchResource("items"),
          fetchResource("locations"),
        ]);

        if (ignore) {
          return;
        }

        setDepartments(departmentData || []);
        setStores(storeData || []);
        setCatalogItems(itemData || []);
        setLocations(locationData || []);

        if (isEditMode) {
          const requisition = await fetchRequisitionById(id);
          if (ignore) {
            return;
          }

          setForm({
            departmentId: requisition.departmentId || "",
            storeId: requisition.storeId || "",
            purpose: requisition.purpose || "",
            requiredDate: requisition.requiredDate || "",
            remarks: requisition.remarks || "",
          });

          setItems(
            (requisition.items || []).map((item) => ({
              itemId: item.itemId || item.item?.id || "",
              locationId: item.locationId || "",
              requestedQty: Number(item.requestedQty ?? item.quantity ?? 1),
              remarks: item.remarks || "",
            }))
          );

          if (requisition.status !== "Draft" && requisition.status !== "Rejected") {
            setError(`Requisitions in '${requisition.status}' status cannot be edited.`);
            setItems([]);
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || "Unable to load requisition form.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFormData();

    return () => {
      ignore = true;
    };
  }, [id, isEditMode]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleItemChange(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "requestedQty") {
          return {
            ...item,
            [field]: Number(value) || 0,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  }

  function addItem() {
    setItems((previous) => [...previous, { ...emptyItem }]);
  }

  function removeItem(index) {
    if (items.length === 1) {
      return;
    }

    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }

  function validateForm() {
    if (!form.departmentId) {
      setError("Department is required.");
      return false;
    }

    if (!form.storeId) {
      setError("Store is required.");
      return false;
    }

    if (!form.requiredDate) {
      setError("Required date is required.");
      return false;
    }

    if (!form.purpose.trim()) {
      setError("Purpose is required.");
      return false;
    }

    if (!items.length) {
      setError("Please add at least one item.");
      return false;
    }

    for (const item of items) {
      if (!item.itemId) {
        setError("Please select an item for every row.");
        return false;
      }

      if (Number(item.requestedQty) <= 0) {
        setError("Requested quantity must be greater than zero.");
        return false;
      }
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    const permission = isEditMode ? "update_requisition" : "create_requisition";
    if (!hasPermission(permission)) {
      setError("You do not have permission to save requisitions.");
      return;
    }

    try {
      setSubmitLoading(true);
      setError("");

      const payload = mapRequisitionFormPayload(form, items);
      const result = isEditMode
        ? await updateRequisition(id, payload)
        : await createRequisition(payload);

      navigate(`/requisitions/${result.id}`);
    } catch (submitError) {
      setError(submitError.message || "Unable to save requisition.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="requisition-page">
        <p>Loading requisition form...</p>
      </div>
    );
  }

  return (
    <div className="requisition-page">
      <div className="page-header">
        <div>
          <h1>{isEditMode ? "Edit Requisition" : "New Store Requisition"}</h1>
          <p>{isEditMode ? "Update requisition information and requested materials." : "Prepare a material request for approval."}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <section className="form-section">
          <h2>Request Details</h2>

          <div className="form-grid">
            <label>
              Department
              <select name="departmentId" value={form.departmentId} onChange={handleChange} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Store
              <select name="storeId" value={form.storeId} onChange={handleChange} required>
                <option value="">Select store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Required Date
              <input type="date" name="requiredDate" value={form.requiredDate} onChange={handleChange} required />
            </label>
          </div>

          <label>
            Purpose
            <textarea name="purpose" value={form.purpose} onChange={handleChange} rows="4" placeholder="Describe why the items are needed" required />
          </label>

          <label>
            Remarks
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows="3" placeholder="Optional notes" />
          </label>
        </section>

        <section className="form-section">
          <div className="section-header-row">
            <h2>Requested Items</h2>
            <button type="button" className="secondary-button" onClick={addItem}>
              + Add Item
            </button>
          </div>

          {items.map((item, index) => {
            const selectedItem = catalogItems.find((catalogItem) => catalogItem.id === item.itemId);

            return (
              <div key={`${item.itemId || "new"}-${index}`} className="item-entry">
                <div className="form-grid item-grid">
                  <label>
                    Item
                    <select name="itemId" value={item.itemId} onChange={(event) => handleItemChange(index, "itemId", event.target.value)} required>
                      <option value="">Select item</option>
                      {catalogItems.map((catalogItem) => (
                        <option key={catalogItem.id} value={catalogItem.id}>
                          {catalogItem.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Location
                    <select name="locationId" value={item.locationId} onChange={(event) => handleItemChange(index, "locationId", event.target.value)}>
                      <option value="">Select location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code || location.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Quantity
                    <input type="number" min="1" name="requestedQty" value={item.requestedQty} onChange={(event) => handleItemChange(index, "requestedQty", event.target.value)} required />
                  </label>

                  <label>
                    Unit
                    <input type="text" value={selectedItem?.unit?.name || selectedItem?.unit || ""} readOnly />
                  </label>
                </div>

                <label>
                  Item Remarks
                  <input type="text" name="remarks" value={item.remarks} onChange={(event) => handleItemChange(index, "remarks", event.target.value)} placeholder="Optional remarks" />
                </label>

                {items.length > 1 && (
                  <button type="button" className="danger-button inline-button" onClick={() => removeItem(index)}>
                    Remove Item
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" className="danger-button" onClick={() => navigate("/requisitions")}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitLoading}>
            {submitLoading ? "Saving..." : isEditMode ? "Save Changes" : "Submit Requisition"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewRequisition;

