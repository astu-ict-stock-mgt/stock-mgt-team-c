import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchReturnById, inspectReturn } from "../../api/returns";
import "./returns.css";

function InspectReturn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [returnItem, setReturnItem] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchReturnById(id);
        if (!mounted) return;
        if (!data || data.status !== "RECEIVED") {
          // If not in RECEIVED state, it shouldn't be inspected.
          alert("This return is not pending inspection.");
          navigate(`/returns/${id}`);
          return;
        }

        setReturnItem(data);
        
        // Populate items
        setItems(
          data.items.map(it => ({
            id: it.id,
            itemId: it.itemId,
            itemCode: it.item?.code || it.itemCode,
            itemName: it.item?.name || it.itemName,
            unit: it.unit,
            returnedQuantity: it.returnedQuantity,
            acceptedQuantity: it.returnedQuantity, // default accept all
            rejectedQuantity: 0,
            condition: it.condition || "Good",
            remarks: it.remarks || "",
          }))
        );
      } catch (err) {
        console.error("Unable to load return:", err);
        navigate("/returns");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, navigate]);


  function handleItemChange(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, [field]: value };
        
        // Auto-balance quantities if one changes
        if (field === "acceptedQuantity") {
          const acc = Number(value);
          if (acc <= item.returnedQuantity) {
            updated.rejectedQuantity = item.returnedQuantity - acc;
          }
        } else if (field === "rejectedQuantity") {
          const rej = Number(value);
          if (rej <= item.returnedQuantity) {
            updated.acceptedQuantity = item.returnedQuantity - rej;
          }
        }
        
        return updated;
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    for (const item of items) {
      if (Number(item.acceptedQuantity) + Number(item.rejectedQuantity) !== Number(item.returnedQuantity)) {
        setSubmitError(`Accepted and Rejected quantities must precisely equal returned quantity for item ${item.itemName}.`);
        return;
      }
    }

    const payload = {
      items: items.map((it) => ({
        id: it.id,
        acceptedQuantity: Number(it.acceptedQuantity),
        rejectedQuantity: Number(it.rejectedQuantity),
        condition: it.condition,
        remarks: it.remarks,
      })),
    };

    try {
      setSubmitting(true);
      await inspectReturn(id, payload);
      navigate(`/returns/${id}`);
    } catch (err) {
      console.error("Inspect failed:", err);
      setSubmitError(err?.message || "Unable to inspect return.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !returnItem) {
    return (
      <div className="module-page">
        <div className="empty-state">Loading inspection...</div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <button type="button" className="back-link" onClick={() => navigate(`/returns/${id}`)}>
            &larr; Return Details
          </button>
          <h1>Inspect Return: {returnItem.returnNumber || id.split("-")[0]}</h1>
          <p>Inspect returned items and determine accepted vs rejected quantities.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h2>Return Details</h2>
          <div className="detail-list">
            <div><span>Requester</span><strong>{returnItem.requester?.fullName || returnItem.requester?.username || "-"}</strong></div>
            <div><span>Department</span><strong>{returnItem.department?.name || returnItem.departmentId || "-"}</strong></div>
            <div><span>Return Date</span><strong>{new Date(returnItem.createdAt).toLocaleString()}</strong></div>
            <div><span>Reason</span><strong>{returnItem.reason}</strong></div>
          </div>
        </div>

        <div className="form-card">
          <div className="section-heading">
            <div>
              <h2>Inspection</h2>
              <p>Review the condition of each item and accept or reject the returned quantities.</p>
            </div>
          </div>

          {submitError && (
             <div className="error-message" style={{ marginBottom: "1rem", color: "red" }}>
               {submitError}
             </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Returned Qty</th>
                  <th style={{ width: "120px" }}>Accepted Qty</th>
                  <th style={{ width: "120px" }}>Rejected Qty</th>
                  <th>Condition</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.itemCode}</strong>
                      <div>{item.itemName}</div>
                    </td>
                    <td>{item.returnedQuantity}</td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        max={item.returnedQuantity} 
                        value={item.acceptedQuantity}
                        onChange={(e) => handleItemChange(index, "acceptedQuantity", e.target.value)}
                        required
                        disabled={submitting}
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        max={item.returnedQuantity} 
                        value={item.rejectedQuantity}
                        onChange={(e) => handleItemChange(index, "rejectedQuantity", e.target.value)}
                        required
                        disabled={submitting}
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td>
                      <select 
                        value={item.condition} 
                        onChange={(e) => handleItemChange(index, "condition", e.target.value)}
                        disabled={submitting}
                      >
                        <option>Good</option>
                        <option>Damaged</option>
                        <option>Obsolete</option>
                        <option>Expired</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={item.remarks}
                        onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                        placeholder="Inspector notes"
                        disabled={submitting}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions" style={{ marginTop: "2rem" }}>
            <button type="button" className="secondary-button" onClick={() => navigate(`/returns/${id}`)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Processing..." : "Complete Inspection"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default InspectReturn;
