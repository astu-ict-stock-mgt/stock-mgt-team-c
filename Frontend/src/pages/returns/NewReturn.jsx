import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createReturn } from "../../api/returns";
import { fetchIssues } from "../../api/issuing";
import "./returns.css";

function NewReturn() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [issuesError, setIssuesError] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState("");

  const [form, setForm] = useState({
    reason: "",
    notes: "",
  });

  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Load issues that can be returned (Issued or Completed)
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoadingIssues(true);
        setIssuesError(null);
        // Load issues to pick from — fetch all statuses (backend caps limit at 100),
        // then keep only those eligible for return (Issued or Completed).
        const { data: fetched } = await fetchIssues({ limit: 100 });
        if (!mounted) return;
        const eligible = fetched.filter(
          (i) => i.status?.toUpperCase() === "ISSUED" || i.status?.toUpperCase() === "COMPLETED"
        );
        setIssues(eligible);
      } catch (err) {
        console.error("Failed to load issues:", err);
        if (mounted) setIssuesError(err.message || "Failed to load eligible store issues.");
      } finally {
        if (mounted) setLoadingIssues(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const selectedIssue = useMemo(() => {
    return issues.find((i) => i.id === selectedIssueId) || null;
  }, [issues, selectedIssueId]);

  // When an issue is selected, pre-populate items
  useEffect(() => {
    if (selectedIssue) {
      setItems(
        selectedIssue.items.map((it) => ({
          itemId: it.itemId,
          itemCode: it.itemCode,
          itemName: it.itemName,
          unit: it.unit,
          locationId: it.locationId,
          issuedQty: it.issuedQty,
          returnedQuantity: 0,
          condition: "Good",
          remarks: "",
        }))
      );
    } else {
      setItems([]);
    }
  }, [selectedIssue]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleItemChange(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, [field]: value };
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedIssue) {
      setSubmitError("Please select a Store Issue.");
      return;
    }

    const returnedItems = items.filter(it => Number(it.returnedQuantity) > 0);
    if (returnedItems.length === 0) {
      setSubmitError("You must return a quantity greater than 0 for at least one item.");
      return;
    }

    for (const item of returnedItems) {
      if (item.returnedQuantity > item.issuedQty) {
        setSubmitError(`Cannot return more than issued quantity for item ${item.itemName}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const created = await createReturn({
        storeIssueId: selectedIssue.id,
        departmentId: selectedIssue.departmentId,
        storeId: selectedIssue.storeId,
        reason: form.reason,
        remarks: form.notes,
        items: returnedItems.map((it) => ({
          itemId: it.itemId,
          locationId: it.locationId || null,
          returnedQuantity: Number(it.returnedQuantity),
          condition: it.condition,
          remarks: it.remarks,
        })),
      });

      navigate(`/returns/${created.id}`);
    } catch (err) {
      console.error("Failed to create return:", err);
      setSubmitError(err?.message || "Unable to create return.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <button type="button" className="back-link" onClick={() => navigate("/returns")}>
            &larr; Returns
          </button>
          <h1>Create Material Return</h1>
          <p>Create a Store Return Note for materials being returned to the store.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h2>Return Source</h2>

          {submitError && (
            <div className="error-message" style={{ marginBottom: "1rem", color: "red" }}>
              {submitError}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full-width">
              <label>Select Store Issue</label>
              {loadingIssues ? (
                <p>Loading eligible store issues...</p>
              ) : issuesError ? (
                <div style={{ color: "red" }}>{issuesError} <button type="button" onClick={() => window.location.reload()}>Retry</button></div>
              ) : issues.length === 0 ? (
                <p>No eligible issued or completed store issues found for return.</p>
              ) : (
                <select
                  value={selectedIssueId}
                  onChange={(e) => setSelectedIssueId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">Select a Store Issue</option>
                  {issues.map(issue => (
                    <option key={issue.id} value={issue.id}>
                      {issue.issueNo} - {issue.department} (Issued: {issue.issueDate})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedIssue && (
              <>
                <div className="form-group">
                  <label>Department</label>
                  <input value={selectedIssue.department} readOnly disabled />
                </div>
                <div className="form-group">
                  <label>Store</label>
                  <input value={selectedIssue.storeName} readOnly disabled />
                </div>
              </>
            )}

            <div className="form-group full-width">
              <label>Reason for Return</label>
              <textarea name="reason" value={form.reason} onChange={handleFormChange} rows="2" required disabled={submitting} />
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleFormChange} rows="2" disabled={submitting} />
            </div>
          </div>
        </div>

        {selectedIssue && (
          <div className="form-card">
            <div className="section-heading">
              <div>
                <h2>Issued Items</h2>
                <p>Specify the quantity being returned for each item. Leave quantity as 0 if not returning.</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unit</th>
                    <th>Issued Qty</th>
                    <th style={{ width: "120px" }}>Return Qty</th>
                    <th>Condition</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.itemId}>
                      <td>
                        <strong>{item.itemCode}</strong>
                        <div>{item.itemName}</div>
                      </td>
                      <td>{item.unit}</td>
                      <td>{item.issuedQty}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.issuedQty}
                          value={item.returnedQuantity}
                          onChange={(e) => handleItemChange(index, "returnedQuantity", e.target.value)}
                          style={{ width: "100%" }}
                          disabled={submitting}
                        />
                      </td>
                      <td>
                        <select
                          value={item.condition}
                          onChange={(e) => handleItemChange(index, "condition", e.target.value)}
                          disabled={Number(item.returnedQuantity) === 0 || submitting}
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
                          placeholder="Optional notes"
                          disabled={Number(item.returnedQuantity) === 0 || submitting}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Return Request"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default NewReturn;
