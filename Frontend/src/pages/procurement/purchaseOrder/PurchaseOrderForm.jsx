import { useState, useEffect } from "react";
import { fetchResource } from "../../../api/masterData";
import { fetchPurchaseRequisitions, fetchPurchaseRequisition } from "../../../api/procurement";

function PurchaseOrderForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState(
    initialData || {
      expectedDeliveryDate: "",
      supplierId: "",
      requisitionId: "",
      notes: "",
      items: [],
    }
  );

  const [suppliers, setSuppliers] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const promises = [
          fetchResource("suppliers", { limit: 100 }),
          fetchPurchaseRequisitions({ status: "APPROVED", limit: 100 })
        ];

        if (initialData?.requisitionId) {
          promises.push(fetchPurchaseRequisition(initialData.requisitionId));
        }

        const results = await Promise.all(promises);

        if (isMounted) {
          const suppResult = results[0];
          let reqResult = results[1];
          let explicitReq = null;

          if (initialData?.requisitionId) {
            explicitReq = results[2];
            // Make sure the explicit requisition is in the array if not already
            if (!reqResult.some(r => r.id === explicitReq.id)) {
              reqResult = [explicitReq, ...reqResult];
            }
          }

          setSuppliers(suppResult);

          const activeReqs = reqResult.filter(req => req.status === "APPROVED" || (initialData && req.id === initialData.requisitionId));
          setRequisitions(activeReqs);

          if (initialData?.requisitionId) {
            const req = explicitReq || activeReqs.find(r => r.id === initialData.requisitionId);
            setSelectedRequisition(req);

            // If editing, update the maxQuantity of existing items from the requisition data
            if (req && req.items) {
              setFormData(prev => ({
                ...prev,
                items: prev.items.map(item => {
                  const reqItem = req.items.find(rItem => rItem.id === item.requisitionItemId);
                  return {
                    ...item,
                    maxQuantity: reqItem ? Number(reqItem.quantity) : item.maxQuantity
                  };
                })
              }));
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load form dependencies.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "requisitionId") {
      const req = requisitions.find(r => r.id === value);
      setSelectedRequisition(req);

      if (req && req.items) {
        // Pre-fill items from requisition
        setFormData(prev => ({
          ...prev,
          supplierId: req.supplierId || prev.supplierId, // default to requisition's suggested supplier if any
          items: req.items.map(item => ({
            id: `new-${item.id}`,
            requisitionItemId: item.id,
            itemId: item.itemId,
            itemCode: item.itemCode || item.item?.code || item.item?.name || "Unknown Item",
            itemName: item.itemName || item.item?.name || "Unknown Item",
            maxQuantity: Number(item.quantity),
            quantity: Number(item.quantity),
            unit: item.unit || item.item?.unit?.name || "Piece",
            unitPrice: 0,
          }))
        }));
      } else {
        setFormData(prev => ({ ...prev, items: [] }));
      }
    }
  };

  const handleItemChange = (id, field, value) => {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === id
          ? {
            ...item,
            [field]: value,
          }
          : item
      ),
    }));
  };

  const removeItem = (id) => {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.filter((item) => item.id !== id),
    }));
  };

  const totalAmount = formData.items.reduce(
    (total, item) =>
      total +
      Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.supplierId || !formData.requisitionId || formData.items.length === 0) {
      alert("Please fill all required fields and ensure there is at least one item.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        items: formData.items.map((item) => ({
          id: item.id.startsWith("new-") ? undefined : item.id,
          requisitionItemId: item.requisitionItemId,
          itemId: item.itemId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="form-card"><p>Loading form dependencies...</p></div>;
  }

  if (error) {
    return (
      <div className="form-card">
        <div style={{ color: "red", padding: "20px", border: "1px solid red", borderRadius: "8px", background: "#fef2f2" }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Requisition *</label>
          <select
            name="requisitionId"
            value={formData.requisitionId}
            onChange={handleChange}
            required
            disabled={!!initialData} // Cannot change requisition when editing a PO
          >
            <option value="">-- Select Approved Requisition --</option>
            {requisitions.map(req => (
              <option key={req.id} value={req.id}>
                {req.reference || req.requestNumber} - {req.department || "Dept"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Supplier *</label>
          <select
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map(sup => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Expected Delivery Date</label>
          <input
            type="date"
            name="expectedDeliveryDate"
            value={formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate).toISOString().split('T')[0] : ""}
            onChange={handleChange}
          />
        </div>

        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            rows={2}
          />
        </div>
      </div>

      <h2 style={{ margin: "30px 0 18px", fontSize: "17px" }}>Order Items</h2>

      {formData.items.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic", marginBottom: "20px" }}>
          Select a requisition to load items.
        </p>
      ) : (
        formData.items.map((item) => (
          <div key={item.id} className="form-grid" style={{ marginBottom: "15px", alignItems: "end" }}>
            <div className="form-group">
              <label>Item</label>
              <input
                value={`${item.itemCode} - ${item.itemName}`}
                disabled
                title="Sourced from requisition"
              />
            </div>

            <div className="form-group">
              <label>Quantity (Max: {item.maxQuantity})</label>
              <input
                type="number"
                min="1"
                max={item.maxQuantity}
                value={item.quantity}
                onChange={(event) =>
                  handleItemChange(item.id, "quantity", event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Unit Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(event) =>
                  handleItemChange(item.id, "unitPrice", event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Line Total</label>
              <input
                value={(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                readOnly
                disabled
              />
            </div>

            <div className="form-group">
              <button
                type="button"
                className="secondary-button"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: "25px", textAlign: "right", fontWeight: "600", fontSize: "16px" }}>
        Total Amount: {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      <div className="form-actions">
        <button type="button" className="danger-button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (initialData ? "Update Purchase Order" : "Create Purchase Order")}
        </button>
      </div>
    </form>
  );
}

export default PurchaseOrderForm;