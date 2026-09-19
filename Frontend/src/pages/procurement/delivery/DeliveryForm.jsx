import { useState, useEffect } from "react";
import { fetchPurchaseOrders } from "../../../api/procurement";
import { fetchResource } from "../../../api/masterData";

function DeliveryForm({
  initialData = null,
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState(
    initialData || {
      purchaseOrderId: "",
      expectedDate: "",
      actualDate: "",
      status: "IN_TRANSIT",
      notes: "",
      items: [],
    }
  );

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [poResult, suppliersResult] = await Promise.all([
          fetchPurchaseOrders({ limit: 100 }),
          fetchResource("suppliers", { limit: 100 })
        ]);

        if (isMounted) {
          const eligiblePOs = poResult.filter(
            (po) =>
              po.status === "ORDERED" ||
              po.status === "PARTIALLY_RECEIVED" ||
              (initialData && po.id === initialData.purchaseOrderId)
          );
          setPurchaseOrders(eligiblePOs);
          setSuppliers(suppliersResult);

          if (initialData?.purchaseOrderId) {
            const po = eligiblePOs.find((p) => p.id === initialData.purchaseOrderId);
            setSelectedPO(po);
            if (po?.supplierId) setSelectedSupplierId(po.supplierId);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load Purchase Orders.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "purchaseOrderId") {
      const po = purchaseOrders.find((p) => p.id === value);
      setSelectedPO(po);

      if (po && po.items) {
        // Pre-fill items with remaining quantity
        const eligibleItems = po.items.map((item) => {
          const maxDeliverable = Number(item.quantity) - Number(item.deliveredQuantity || 0);
          return {
            id: `new-${item.id}`,
            purchaseOrderItemId: item.id,
            itemCode: item.item?.code || item.itemCode,
            itemName: item.item?.name || item.itemName,
            maxQuantity: maxDeliverable,
            quantity: 0, // start at 0 so user has to enter what they received
          };
        }).filter(item => item.maxQuantity > 0);

        setFormData((prev) => ({
          ...prev,
          items: eligibleItems,
        }));
      } else {
        setFormData((prev) => ({ ...prev, items: [] }));
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.purchaseOrderId) {
      alert("Please select a Purchase Order.");
      return;
    }

    const validItems = formData.items.filter(i => Number(i.quantity) > 0);

    if (!initialData && validItems.length === 0) {
      alert("Please enter a quantity greater than 0 for at least one item.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData };

      // Normalize empty dates to undefined
      if (!payload.expectedDate) payload.expectedDate = undefined;
      if (!payload.actualDate) payload.actualDate = undefined;
      if (!payload.notes) payload.notes = undefined;

      if (!initialData) {
        // Create payload must not include status
        delete payload.status;

        payload.items = validItems.map(item => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          quantity: Number(item.quantity),
        }));
      } else {
        // Update payload must not include items or purchaseOrderId
        delete payload.items;
        delete payload.purchaseOrderId;
      }

      await onSave(payload);
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
          <label>Supplier</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => {
              setSelectedSupplierId(e.target.value);
              setFormData((prev) => ({ ...prev, purchaseOrderId: "", items: [] }));
              setSelectedPO(null);
            }}
            disabled={!!initialData}
          >
            <option value="">-- All Suppliers --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Purchase Order *</label>
          <select
            name="purchaseOrderId"
            value={formData.purchaseOrderId}
            onChange={handleChange}
            required
            disabled={!!initialData}
          >
            <option value="">-- Select PO --</option>
            {purchaseOrders
              .filter(po => !selectedSupplierId || po.supplierId === selectedSupplierId)
              .map((po) => (
                <option key={po.id} value={po.id}>
                  {po.number || po.orderNumber} - {po.supplier?.name || po.supplier}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Expected Delivery Date</label>
          <input
            type="date"
            name="expectedDate"
            value={formData.expectedDate ? new Date(formData.expectedDate).toISOString().split('T')[0] : ""}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Actual Delivery Date</label>
          <input
            type="date"
            name="actualDate"
            value={formData.actualDate ? new Date(formData.actualDate).toISOString().split('T')[0] : ""}
            onChange={handleChange}
          />
        </div>

        {initialData && (
          <div className="form-group">
            <label>Status *</label>
            <select name="status" value={formData.status} onChange={handleChange} required>
              {initialData.status === "IN_TRANSIT" && <option value="IN_TRANSIT">IN TRANSIT</option>}

              {(initialData.status === "IN_TRANSIT" || initialData.status === "PARTIALLY_RECEIVED") && (
                <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
              )}

              {(initialData.status === "IN_TRANSIT" || initialData.status === "PARTIALLY_RECEIVED" || initialData.status === "RECEIVED") && (
                <option value="RECEIVED">RECEIVED</option>
              )}

              {(initialData.status === "IN_TRANSIT" || initialData.status === "PARTIALLY_RECEIVED" || initialData.status === "CANCELLED") && (
                <option value="CANCELLED">CANCELLED</option>
              )}
            </select>
          </div>
        )}

        <div className="form-group full-width" style={{ gridColumn: "1 / -1" }}>
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            placeholder="Additional delivery information..."
            rows={2}
          />
        </div>
      </div>

      <h2 style={{ margin: "30px 0 18px", fontSize: "17px" }}>Delivery Items</h2>
      {!initialData && (
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>
          Enter the quantity received for this delivery.
        </p>
      )}

      {initialData && (
        <p style={{ color: "#856404", backgroundColor: "#fff3cd", padding: "10px", borderRadius: "4px", fontSize: "14px", marginBottom: "15px" }}>
          Item quantities cannot be edited after creation to preserve receiving history.
        </p>
      )}

      {formData.items.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic", marginBottom: "20px" }}>
          Select a purchase order to load deliverable items.
        </p>
      ) : (
        formData.items.map((item) => (
          <div key={item.id} className="form-grid" style={{ marginBottom: "15px", alignItems: "end" }}>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label>Item</label>
              <input
                value={`${item.itemCode || "Code"} - ${item.itemName || "Name"}`}
                disabled
              />
            </div>

            {!initialData && (
              <div className="form-group">
                <label>Remaining to Deliver</label>
                <input value={item.maxQuantity} disabled />
              </div>
            )}

            <div className="form-group">
              <label>Quantity Delivered</label>
              <input
                type="number"
                min={initialData ? item.quantity : 0}
                max={initialData ? item.quantity : item.maxQuantity}
                value={item.quantity}
                onChange={(event) => handleItemChange(item.id, "quantity", event.target.value)}
                disabled={!!initialData} // Items cannot be updated
              />
            </div>
          </div>
        ))
      )}

      <div className="form-actions" style={{ marginTop: "30px" }}>
        <button type="button" className="danger-button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (initialData ? "Update Delivery" : "Save Delivery")}
        </button>
      </div>
    </form>
  );
}

export default DeliveryForm;