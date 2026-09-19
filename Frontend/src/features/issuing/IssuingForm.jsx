import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createIssue as createIssueApi } from "../../api/issuing";
import { fetchRequisitions, fetchRequisitionById } from "../../api/requisition";
import { api } from "../../api/client";
import "./issuing.css";

function IssuingForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRequisitionId = searchParams.get("requisitionId") || "";

  const [approvedRequisitions, setApprovedRequisitions] = useState([]);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState(initialRequisitionId);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [inventoryBalances, setInventoryBalances] = useState([]);

  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const reqRes = await fetchRequisitions({ status: "Approved", limit: 100 });
        if (!active) return;

        const reqList = Array.isArray(reqRes?.data) ? reqRes.data : [];
        setApprovedRequisitions(reqList);

        let targetReqId = initialRequisitionId;
        if (!targetReqId && reqList.length > 0) {
          targetReqId = reqList[0].id;
        }

        if (targetReqId) {
          await loadRequisitionData(targetReqId, active);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load requisitions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [initialRequisitionId]);

  async function loadRequisitionData(reqId, active = true) {
    setSelectedRequisitionId(reqId);
    try {
      const single = await fetchRequisitionById(reqId);
      if (!active) return;
      setSelectedRequisition(single);

      // Fetch inventory balances for this store to get locations with stock
      const invRes = await api.get('/inventory', { storeId: single.storeId, limit: 500 });
      if (!active) return;
      
      const balances = Array.isArray(invRes?.data?.data) ? invRes.data.data : (Array.isArray(invRes?.data) ? invRes.data : []);
      setInventoryBalances(balances);

      setItems(
        (single.items || []).map((it) => {
          const approvedQty = Number(it.approvedQty > 0 ? it.approvedQty : it.requestedQty);
          const issuedQty = Number(it.issuedQty || 0);
          const remainingQty = Math.max(0, approvedQty - issuedQty);
          
          // Find locations holding this item
          const itemBalances = balances.filter(b => b.itemId === it.itemId && Number(b.quantity) > 0);
          const defaultLocId = itemBalances.length > 0 ? itemBalances[0].locationId : "";

          return {
            requisitionItemId: it.id,
            itemId: it.itemId,
            itemCode: it.itemCode || "",
            itemName: it.itemName || "",
            unit: it.unit || "",
            locationId: defaultLocId,
            requestedQty: Number(it.requestedQty),
            approvedQty: approvedQty,
            remainingQty: remainingQty,
            issuedQty: remainingQty,
            remarks: "",
            availableLocations: itemBalances,
          };
        })
      );
    } catch (err) {
      setError(err.message || "Failed to load requisition details.");
    }
  }

  async function handleRequisitionChange(newReqId) {
    if (!newReqId) {
      setSelectedRequisitionId("");
      setSelectedRequisition(null);
      setItems([]);
      setInventoryBalances([]);
      return;
    }
    await loadRequisitionData(newReqId);
  }

  function handleItemLocationChange(index, locId) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, locationId: locId } : item))
    );
  }

  function handleItemIssuedQtyChange(index, qty) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, issuedQty: Number(qty) } : item))
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!selectedRequisition) {
      setError("Please select an approved requisition.");
      return;
    }

    const validItems = items.filter((it) => Number(it.issuedQty) > 0 && it.locationId);
    if (validItems.length === 0) {
      setError("Please specify valid issued quantities and picking locations for at least one item.");
      return;
    }

    for (const it of validItems) {
      if (it.issuedQty > it.remainingQty) {
        setError(`Issued quantity for ${it.itemCode} cannot exceed remaining quantity (${it.remainingQty}).`);
        return;
      }
    }

    const payload = {
      requisitionId: selectedRequisition.id,
      storeId: selectedRequisition.storeId,
      remarks: remarks ? remarks.trim() : null,
      items: validItems.map((it) => ({
        requisitionItemId: it.requisitionItemId,
        itemId: it.itemId,
        locationId: it.locationId,
        issuedQty: Number(it.issuedQty),
        remarks: it.remarks || null,
      })),
    };

    setSubmitting(true);
    try {
      const created = await createIssueApi(payload);
      navigate(`/issuing/${created.data?.id || created.id}`);
    } catch (err) {
      setError(err.message || "Failed to create store issue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="issuing-page">
        <p>Loading approved requisitions...</p>
      </div>
    );
  }

  return (
    <div className="issuing-page">
      <div className="page-header">
        <div>
          <Link to="/issuing" className="back-link">
            ← Back to Store Issues
          </Link>
          <h1>Create Store Issue</h1>
          <p>Fulfill approved store requisition and prepare picking items.</p>
        </div>
      </div>

      {error && <div className="form-error" style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>}

      <form onSubmit={handleSubmit} className="form-card">
        <h2>Requisition Selection</h2>
        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="requisitionSelect">Select Approved Requisition *</label>
            <select
              id="requisitionSelect"
              value={selectedRequisitionId}
              onChange={(e) => handleRequisitionChange(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="">-- Select Approved Requisition --</option>
              {approvedRequisitions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requisitionNo} — {r.department} ({r.store}) - {r.purpose}
                </option>
              ))}
            </select>
          </div>

          {selectedRequisition && (
            <>
              <div className="form-group">
                <label>Department</label>
                <input value={selectedRequisition.department || ""} disabled />
              </div>
              <div className="form-group">
                <label>Store</label>
                <input value={selectedRequisition.store || ""} disabled />
              </div>
              <div className="form-group">
                <label>Requester</label>
                <input value={selectedRequisition.requester || ""} disabled />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input value={selectedRequisition.purpose || ""} disabled />
              </div>
            </>
          )}

          <div className="form-group full-width">
            <label htmlFor="remarks">Issue Remarks / Instructions</label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="E.g., Batch picking for Department Laboratory"
              rows={2}
              disabled={submitting}
            />
          </div>
        </div>

        {items.length > 0 && (
          <div className="items-section" style={{ marginTop: "2rem" }}>
            <h3>Items to Pick & Issue</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Approved Qty</th>
                  <th>Remaining Qty</th>
                  <th>Picking Location *</th>
                  <th>Issue Qty *</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.requisitionItemId}>
                    <td>
                      <strong>{item.itemCode}</strong> - {item.itemName}
                    </td>
                    <td>{item.approvedQty}</td>
                    <td><strong style={{ color: item.remainingQty > 0 ? 'inherit' : '#ef4444' }}>{item.remainingQty}</strong></td>
                    <td>
                      <select
                        value={item.locationId}
                        onChange={(e) => handleItemLocationChange(index, e.target.value)}
                        disabled={submitting || item.remainingQty === 0}
                        required={item.remainingQty > 0}
                      >
                        <option value="">-- Select Picking Bin/Location --</option>
                        {item.availableLocations.map((b) => (
                          <option key={b.locationId} value={b.locationId}>
                            {b.location?.code || b.locationId} (Avail: {b.quantity})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={item.remainingQty}
                        value={item.issuedQty}
                        onChange={(e) => handleItemIssuedQtyChange(index, e.target.value)}
                        disabled={submitting || item.remainingQty === 0}
                        style={{ width: "100px" }}
                        required={item.remainingQty > 0}
                      />
                    </td>
                    <td>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: "2rem" }}>
          <button type="submit" className="primary-button" disabled={submitting || !selectedRequisition}>
            {submitting ? "Creating Issue..." : "Create Store Issue (Start Picking)"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default IssuingForm;