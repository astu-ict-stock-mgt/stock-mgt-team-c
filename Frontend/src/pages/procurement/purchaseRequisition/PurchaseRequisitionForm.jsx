import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AuthContext from "../../../context/AuthContext";
import { fetchResource } from "../../../api/masterData";
import {
  createPurchaseRequisition,
  fetchPurchaseRequisitionById,
  mapPurchaseRequisitionFormPayload,
  updatePurchaseRequisition,
} from "../../../api/purchaseRequisition";

import "./purchaseRequisitions.css";

const emptyForm = {
  departmentId: "",
  storeId: "",
  requiredDate: "",
  estimatedCost: "",
  purpose: "",
  notes: "",
};

const emptyItem = {
  itemId: "",
  quantity: 1,
  notes: "",
};

function PurchaseRequisitionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, hasPermission } = useContext(AuthContext);
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      setError("");

      try {
        const [departmentData, storeData, itemData] = await Promise.all([
          fetchResource("departments", { status: "Active", limit: 100 }),
          fetchResource("stores", { status: "Active", limit: 100 }),
          fetchResource("items", { status: "Active", limit: 100 }),
        ]);

        if (!active) return;

        setDepartments(departmentData || []);
        setStores(storeData || []);
        setCatalogItems(itemData || []);

        if (isEditMode) {
          const requisition = await fetchPurchaseRequisitionById(id);
          if (!active) return;

          if (!["DRAFT", "REJECTED"].includes(requisition.status)) {
            throw new Error(`A ${requisition.statusLabel} purchase requisition cannot be edited.`);
          }

          setForm({
            departmentId: requisition.departmentId || "",
            storeId: requisition.storeId || "",
            requiredDate: requisition.requiredDate
              ? new Date(requisition.requiredDate).toISOString().slice(0, 10)
              : "",
            estimatedCost:
              requisition.estimatedCost > 0 ? String(requisition.estimatedCost) : "",
            purpose: requisition.purpose || "",
            notes: requisition.notes || "",
          });

          setItems(
            requisition.items.length
              ? requisition.items.map((item) => ({
                itemId: item.itemId,
                quantity: item.quantity,
                notes: item.notes || "",
              }))
              : [{ ...emptyItem }]
          );
        } else if (user?.departmentId) {
          setForm((previous) => ({
            ...previous,
            departmentId: user.departmentId,
          }));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load purchase requisition form.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadForm();
    return () => {
      active = false;
    };
  }, [id, isEditMode, user?.departmentId]);

  const selectedItems = useMemo(
    () => new Set(items.map((item) => item.itemId).filter(Boolean)),
    [items]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleItemChange(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          [field]: field === "quantity" ? value : value,
        };
      })
    );
  }

  function addItem() {
    setItems((previous) => [...previous, { ...emptyItem }]);
  }

  function removeItem(index) {
    setItems((previous) => {
      if (previous.length === 1) return previous;
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function validateForm() {
    if (!form.departmentId) return "Department is required.";
    if (!form.storeId) return "Receiving store is required.";
    if (!form.requiredDate) return "Required date is required.";
    if (!form.purpose.trim()) return "Purpose is required.";
    if (!items.length) return "At least one required item must be added.";

    if (form.estimatedCost !== "" && Number(form.estimatedCost) < 0) {
      return "Estimated cost cannot be negative.";
    }

    const seen = new Set();
    for (const item of items) {
      if (!item.itemId) return "Select an item for every row.";
      if (Number(item.quantity) <= 0) return "Each quantity must be greater than zero.";
      if (seen.has(item.itemId)) {
        return "The same item cannot be added more than once. Increase its quantity instead.";
      }
      seen.add(item.itemId);
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const permission = isEditMode
      ? "update_purchase_requisition"
      : "create_purchase_requisition";

    if (!hasPermission(permission)) {
      setError("You do not have permission to save purchase requisitions.");
      return;
    }

    try {
      setSaving(true);
      const payload = mapPurchaseRequisitionFormPayload(form, items);
      const saved = isEditMode
        ? await updatePurchaseRequisition(id, payload)
        : await createPurchaseRequisition(payload);

      navigate(`/Procurement-requisitions/${saved.id}`);
    } catch (saveError) {
      setError(saveError.message || "Unable to save purchase requisition.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="purchase-requisition-page">
        <div className="purchase-requisition-panel">Loading purchase requisition form...</div>
      </div>
    );
  }

  return (
    <div className="purchase-requisition-page">
      <div className="purchase-requisition-header">
        <div>
          <h1>{isEditMode ? "Edit Purchase Requisition" : "New Purchase Requisition"}</h1>
          <p>
            Prepare a procurement request for materials that must be purchased and then progressed to a purchase order.
          </p>
        </div>
      </div>

      {error && <div className="purchase-requisition-alert error">{error}</div>}

      <form className="purchase-requisition-form" onSubmit={handleSubmit}>
        <section className="purchase-requisition-panel">
          <div className="section-heading">
            <h2>Request Information</h2>
            <p>The requester is taken from the authenticated user account.</p>
          </div>

          <div className="purchase-requisition-grid">
            <div className="form-field">
              <label>Requester</label>
              <input value={user?.fullName || user?.username || "Current user"} readOnly />
            </div>

            <div className="form-field">
              <label htmlFor="departmentId">Department <span>*</span></label>
              <select id="departmentId" name="departmentId" value={form.departmentId} onChange={handleChange} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code ? `${department.code} — ` : ""}{department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="storeId">Receiving Store <span>*</span></label>
              <select id="storeId" name="storeId" value={form.storeId} onChange={handleChange} required>
                <option value="">Select receiving store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code ? `${store.code} — ` : ""}{store.name}
                  </option>
                ))}
              </select>
              <small>The store is retained for the downstream receiving workflow.</small>
            </div>

            <div className="form-field">
              <label htmlFor="requiredDate">Required Date <span>*</span></label>
              <input id="requiredDate" name="requiredDate" type="date" value={form.requiredDate} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="estimatedCost">Estimated Cost</label>
              <input
                id="estimatedCost"
                name="estimatedCost"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCost}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="purpose">Purpose <span>*</span></label>
              <textarea
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                rows="3"
                maxLength="500"
                placeholder="Explain why these materials are required."
                required
              />
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                maxLength="1000"
                placeholder="Additional procurement notes or specifications."
              />
            </div>
          </div>
        </section>

        <section className="purchase-requisition-panel">
          <div className="section-heading section-heading-actions">
            <div>
              <h2>Required Items</h2>
              <p>Add every material that must be purchased. Quantities must be greater than zero.</p>
            </div>
            <button type="button" className="secondary-button" onClick={addItem}>
              + Add Item
            </button>
          </div>

          <div className="item-table-wrapper">
            <table className="item-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Item Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const selected = catalogItems.find((catalogItem) => catalogItem.id === item.itemId);
                  return (
                    <tr key={`${index}-${item.itemId || "new"}`}>
                      <td>
                        <select
                          value={item.itemId}
                          onChange={(event) => handleItemChange(index, "itemId", event.target.value)}
                          required
                        >
                          <option value="">Select item</option>
                          {catalogItems.map((catalogItem) => (
                            <option
                              key={catalogItem.id}
                              value={catalogItem.id}
                              disabled={selectedItems.has(catalogItem.id) && catalogItem.id !== item.itemId}
                            >
                              {catalogItem.code ? `${catalogItem.code} — ` : ""}{catalogItem.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{selected?.unit?.name || selected?.unitName || selected?.unit || "—"}</td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          maxLength="500"
                          value={item.notes}
                          onChange={(event) => handleItemChange(index, "notes", event.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <button type="button" className="table-danger-button" onClick={() => removeItem(index)} disabled={items.length === 1}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="purchase-requisition-form-actions">
          <button type="button" className="danger-button" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Save Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PurchaseRequisitionForm;
