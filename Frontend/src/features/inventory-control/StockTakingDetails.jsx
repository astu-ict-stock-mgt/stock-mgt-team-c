import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchStockTakingById, addStockTakingCount, compareStockTaking, investigateDiscrepancy } from "../../api/stockTaking";
import { fetchResource } from "../../api/masterData";
import "./control.css";

function StockTakingDetails() {
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [countForm, setCountForm] = useState({
    itemId: "",
    locationId: "",
    physicalQuantity: "",
    remarks: ""
  });

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [investigateData, setInvestigateData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masterDataError, setMasterDataError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadMasterData() {
      try {
        const [itemsData, locsData] = await Promise.all([
          fetchResource("items", { limit: 100 }),
          fetchResource("locations", { limit: 100 })
        ]);
        if (mounted) {
          setItems(itemsData);
          setLocations(locsData);
        }
      } catch (err) {
        console.error("Failed to load master data:", err);
        if (mounted) setMasterDataError("Failed to load items/locations for this session.");
      }
    }
    loadMasterData();
    return () => { mounted = false; };
  }, []);

  const loadSession = async () => {
    try {
      const data = await fetchStockTakingById(id);
      setSession(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load stock taking session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [id]);

  const handleAddCount = async (e) => {
    e.preventDefault();
    if (countForm.physicalQuantity < 0) {
      alert("Physical quantity cannot be negative.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addStockTakingCount(id, {
        itemId: countForm.itemId,
        locationId: countForm.locationId,
        physicalQuantity: Number(countForm.physicalQuantity),
        remarks: countForm.remarks
      });
      setCountForm({ itemId: "", locationId: "", physicalQuantity: "", remarks: "" });
      await loadSession();
    } catch (err) {
      alert("Failed to add count: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompare = async () => {
    setIsSubmitting(true);
    try {
      await compareStockTaking(id);
      await loadSession();
    } catch (err) {
      alert("Failed to compare: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvestigateChange = (discrepancyId, field, value) => {
    setInvestigateData((prev) => ({
      ...prev,
      [discrepancyId]: {
        ...prev[discrepancyId],
        [field]: value
      }
    }));
  };

  const handleInvestigateSubmit = async (discrepancyId) => {
    const data = investigateData[discrepancyId];
    if (!data?.reason || !data?.investigation) {
      alert("Please provide both reason and investigation details.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await investigateDiscrepancy(discrepancyId, {
        reason: data.reason,
        investigation: data.investigation
      });
      await loadSession();
    } catch (err) {
      alert("Failed to investigate discrepancy: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="control-page"><p>Loading session...</p></div>;
  if (!session) return <div className="control-page"><p>Session not found.</p></div>;

  const counts = session.counts || [];
  const discrepancies = session.discrepancies || [];

  return (
    <div className="control-page">

      <div className="page-header">

        <div>
          <Link
            to="/stock-taking"
            className="back-link"
          >
            ← Stock Taking
          </Link>

          <h1>{session.sessionNumber}</h1>

          <p>
            Physical count and reconciliation
          </p>
        </div>

      </div>

      <div className="workflow">

        <span className={session.status === "CREATED" ? "active" : "completed"}>
          Created
        </span>

        <span className={session.status === "COUNTING" ? "active" : ["COUNTED", "INVESTIGATING", "PENDING_APPROVAL", "APPROVED", "COMPLETED"].includes(session.status) ? "completed" : ""}>
          Physical Count
        </span>

        <span className={session.status === "COUNTED" ? "active" : ["INVESTIGATING", "PENDING_APPROVAL", "APPROVED", "COMPLETED"].includes(session.status) ? "completed" : ""}>
          Reconciliation
        </span>

        <span className={session.status === "INVESTIGATING" ? "active" : ["PENDING_APPROVAL", "APPROVED", "COMPLETED"].includes(session.status) ? "completed" : ""}>
          Investigation
        </span>

        <span className={["PENDING_APPROVAL", "APPROVED", "COMPLETED"].includes(session.status) ? "active" : ""}>
          Approval
        </span>

      </div>

      <div className="table-card">

        <table>

          <thead>

            <tr>
              <th>Item ID</th>
              <th>Location ID</th>
              <th>System Qty</th>
              <th>Physical Qty</th>
              <th>Remarks</th>
            </tr>

          </thead>

          <tbody>

            {counts.map((count) => {
              const itemInfo = items.find(i => i.id === count.itemId);
              const locInfo = locations.find(l => l.id === count.locationId);
              return (

                <tr key={`${count.itemId}-${count.locationId}`}>

                  <td>{itemInfo ? itemInfo.name : count.itemId}</td>

                  <td>{locInfo ? (locInfo.label || locInfo.code) : count.locationId}</td>

                  <td>{count.systemQuantity}</td>

                  <td>{count.physicalQuantity}</td>

                  <td>{count.remarks || "-"}</td>

                </tr>

              );

            })}

            {counts.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>No counts recorded yet.</td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

      <div className="reconciliation-panel">

        <h2>Record Physical Count</h2>

        {masterDataError && <p style={{ color: "red" }}>{masterDataError}</p>}
        {["CREATED", "COUNTING", "COUNTED"].includes(session.status) && (
          <form className="form-grid" onSubmit={handleAddCount} style={{ marginBottom: "20px" }}>
            <div className="form-group">
              <label>Item</label>
              <select required value={countForm.itemId} onChange={e => setCountForm({ ...countForm, itemId: e.target.value })} className="select-input">
                <option value="" disabled>Select Item</option>
                {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <select required value={countForm.locationId} onChange={e => setCountForm({ ...countForm, locationId: e.target.value })} className="select-input">
                <option value="" disabled>Select Location</option>
                {locations.filter(loc => loc.storeId === session.storeId || !loc.storeId).map(loc => <option key={loc.id} value={loc.id}>{loc.label || loc.code}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Physical Quantity</label>
              <input required type="number" min="0" step="any" value={countForm.physicalQuantity} onChange={e => setCountForm({ ...countForm, physicalQuantity: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Remarks</label>
              <input value={countForm.remarks} onChange={e => setCountForm({ ...countForm, remarks: e.target.value })} />
            </div>
            <button className="primary-button" style={{ gridColumn: "1 / -1" }} disabled={isSubmitting}>Add Count</button>
          </form>
        )}
        {!["CREATED", "COUNTING", "COUNTED"].includes(session.status) && (
           <p style={{fontStyle: 'italic', color: '#666', marginBottom: '20px'}}>Counts cannot be added to a session in {session.status} status.</p>
        )}

        <h2>Reconciliation Summary</h2>

        <p>
          Items counted:{" "}
          <strong>{counts.length}</strong>
        </p>

        <p>
          Discrepancies:{" "}
          <strong>{discrepancies.length}</strong>
        </p>

        {discrepancies.length > 0 && (
          <div className="table-card" style={{ marginTop: '20px' }}>
            <div className="alert-panel" style={{ marginBottom: '15px' }}>
              <strong>Investigation Required</strong>
              <p>Some physical quantities do not match system quantities. Investigate the discrepancies before reconciliation.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Location</th>
                  <th>System</th>
                  <th>Physical</th>
                  <th>Diff</th>
                  <th>Status</th>
                  <th>Investigation</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map(d => {
                  const itemInfo = items.find(i => i.id === d.itemId);
                  const locInfo = locations.find(l => l.id === d.locationId);
                  return (
                    <tr key={d.id}>
                      <td>{itemInfo ? itemInfo.name : d.itemId}</td>
                      <td>{locInfo ? (locInfo.label || locInfo.code) : d.locationId}</td>
                      <td>{d.systemQuantity}</td>
                      <td>{d.physicalQuantity}</td>
                      <td>{d.difference}</td>
                      <td><span className="status-badge">{d.status}</span></td>
                      <td>
                        {d.status === "OPEN" ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <input 
                              type="text" 
                              placeholder="Reason" 
                              value={investigateData[d.id]?.reason || ''} 
                              onChange={(e) => handleInvestigateChange(d.id, 'reason', e.target.value)} 
                            />
                            <input 
                              type="text" 
                              placeholder="Investigation details" 
                              value={investigateData[d.id]?.investigation || ''} 
                              onChange={(e) => handleInvestigateChange(d.id, 'investigation', e.target.value)} 
                            />
                            <button 
                              type="button" 
                              onClick={() => handleInvestigateSubmit(d.id)}
                              className="primary-button" 
                              style={{ fontSize: '0.8rem', padding: '5px' }}
                              disabled={isSubmitting}
                            >
                              Submit
                            </button>
                          </div>
                        ) : (
                          <div>
                            <strong>{d.reason}</strong><br/>
                            <small>{d.investigation}</small>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-actions">
          {["CREATED", "COUNTING", "COUNTED", "INVESTIGATING"].includes(session.status) && (
            <button
              className="primary-button"
              onClick={handleCompare}
              disabled={isSubmitting}
            >
              Compare & Submit for Reconciliation
            </button>
          )}
        </div>

      </div>

    </div>
  );
}

export default StockTakingDetails;