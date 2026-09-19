import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import receivingService from "../../services/receivingService";

const initialForm = {
  receiptNumber: "",
  supplierId: "",
  storeId: "",
  sourceType: "PURCHASE_ORDER",
  receiptType: "Purchase Order",
  purchaseReference: "",
  documentReference: "",
  deliveryDate: "",
  description: "",
  itemId: "",
  locationId: "",
  quantityExpected: "",
  quantityReceived: "",
  condition: "Good",
};

function NewReceiving() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [options, setOptions] = useState({
    suppliers: [],
    stores: [],
    items: [],
    locations: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    receivingService.options()
      .then((result) => {
        if (active) setOptions(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const availableItems = useMemo(() => {
    if (!formData.storeId) return [];
    return options.items.filter(item => item.storeId === formData.storeId);
  }, [formData.storeId, options.items]);

  const availableLocations = useMemo(() => {
    if (!formData.storeId) return options.locations;
    return options.locations.filter(
      (location) => !location.storeId || location.storeId === formData.storeId
    );
  }, [formData.storeId, options.locations]);

  const selectedItem = options.items.find((item) => item.id === formData.itemId);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError("");
  }

  function handleStoreChange(event) {
    const storeId = event.target.value;
    setFormData((previous) => ({
      ...previous,
      storeId,
      locationId: "",
      itemId: "",
    }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await receivingService.create({
        receiptNumber: formData.receiptNumber.trim(),
        supplierId: formData.supplierId,
        storeId: formData.storeId,
        sourceType: formData.sourceType,
        receiptType: formData.receiptType,
        purchaseReference: formData.purchaseReference.trim() || undefined,
        documentReference: formData.documentReference.trim() || undefined,
        deliveryDate: formData.deliveryDate,
        description: formData.description.trim() || undefined,
        items: [{
          itemId: formData.itemId,
          locationId: formData.locationId || undefined,
          quantityExpected: formData.quantityExpected !== "" && formData.quantityExpected !== null && formData.quantityExpected !== undefined
            ? Number(formData.quantityExpected)
            : Number(formData.quantityReceived),
          quantityReceived: Number(formData.quantityReceived),
          unit: selectedItem?.unit?.name || selectedItem?.unit?.code || "Unit",
          condition: formData.condition,
          assetClassification: "NON_FIXED",
        }],
      });
      navigate("/receiving");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/receiving">Back to Receiving</Link>
          <h1>New Goods Receipt</h1>
          <p>Record material received from a supplier.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Loading receiving options...</p>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="receipt-number">Receipt Number *</label>
            <input id="receipt-number" name="receiptNumber" value={formData.receiptNumber} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="supplier-id">Supplier *</label>
            <select id="supplier-id" name="supplierId" value={formData.supplierId} onChange={handleChange} required disabled={loading}>
              <option value="">Select supplier</option>
              {options.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.code})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="store-id">Store *</label>
            <select id="store-id" name="storeId" value={formData.storeId} onChange={handleStoreChange} required disabled={loading}>
              <option value="">Select store</option>
              {options.stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.code})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="source-type">Source Type *</label>
            <select id="source-type" name="sourceType" value={formData.sourceType} onChange={handleChange}>
              <option value="PURCHASE_ORDER">Purchase Order</option>
              <option value="DIRECT_PURCHASE">Direct Purchase</option>
              <option value="DONATION">Donation</option>
              <option value="TRANSFER">Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="receipt-type">Receipt Type</label>
            <input id="receipt-type" name="receiptType" value={formData.receiptType} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="delivery-date">Delivery Date *</label>
            <input id="delivery-date" type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="purchase-reference">Purchase Reference</label>
            <input id="purchase-reference" name="purchaseReference" value={formData.purchaseReference} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="document-reference">Document Reference</label>
            <input id="document-reference" name="documentReference" value={formData.documentReference} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="item-id">Item *</label>
            <select id="item-id" name="itemId" value={formData.itemId} onChange={handleChange} required disabled={loading || !formData.storeId}>
              <option value="">Select item</option>
              {availableItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location-id">Storage Location *</label>
            <select id="location-id" name="locationId" value={formData.locationId} onChange={handleChange} required disabled={loading}>
              <option value="">Select location</option>
              {availableLocations.map((location) => <option key={location.id} value={location.id}>{location.code}{location.bin ? ` / Bin ${location.bin}` : ""}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="quantity-expected">Expected Quantity</label>
            <input id="quantity-expected" type="number" min="0" step="1" name="quantityExpected" value={formData.quantityExpected} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="quantity-received">Received Quantity *</label>
            <input id="quantity-received" type="number" min="1" step="1" name="quantityReceived" value={formData.quantityReceived} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="condition">Condition</label>
            <input id="condition" name="condition" value={formData.condition} onChange={handleChange} />
          </div>

          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows="4" value={formData.description} onChange={handleChange} />
          </div>
        </div>

        <div className="form-actions">
          <Link to="/receiving" className="danger-button">Cancel</Link>
          <button type="submit" className="primary-button" disabled={loading || submitting}>
            {submitting ? "Saving..." : "Save Receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewReceiving;
