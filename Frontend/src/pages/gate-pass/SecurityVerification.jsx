import { useState } from "react";
import { list, verify, exit, dispatch } from "./gatePassData";

function SecurityVerification() {
  const [gatePassNumber, setGatePassNumber] = useState("");
  const [selectedPass, setSelectedPass] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");

  const formatStatus = (status) => {
    switch (status) {
      case "CREATED": return "Created";
      case "SECURITY_VERIFIED": return "Security Verified";
      case "EXIT_CONFIRMED": return "Exit Confirmed";
      case "DISPATCH_RECORDED": return "Dispatch Recorded";
      case "CANCELLED": return "Cancelled";
      default: return status;
    }
  };

  const findGatePass = async () => {
    const value = gatePassNumber.trim();

    if (!value) {
      setSelectedPass(null);
      setMessage("Enter a gate pass number.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const data = await list({ search: value });
      
      // Exact match logic
      const pass = data.data.find(p => p.gatePassNumber.toLowerCase() === value.toLowerCase());

      if (!pass) {
        setSelectedPass(null);
        setMessage(`Gate pass ${gatePassNumber} was not found.`);
        setMessageType("error");
        return;
      }

      setSelectedPass(pass);
      setMessage("");
      setMessageType("");
      setRemarks("");
    } catch (err) {
      setSelectedPass(null);
      setMessage(`Error searching gate pass: ${err.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const verifyGatePass = async () => {
    if (!selectedPass) return;

    if (selectedPass.status !== "CREATED") {
      setMessage(`Gate pass ${selectedPass.gatePassNumber} cannot be verified. Current status: ${formatStatus(selectedPass.status)}`);
      setMessageType("warning");
      return;
    }

    try {
      setLoading(true);
      const updatedPass = await verify(selectedPass.id, { remarks });
      
      setSelectedPass(updatedPass);
      setRemarks("");

      setMessage(`Gate pass ${updatedPass.gatePassNumber} has been successfully verified.`);
      setMessageType("success");
    } catch (err) {
      setMessage(`Failed to verify: ${err.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const confirmExit = async () => {
    if (!selectedPass) return;

    if (selectedPass.status !== "SECURITY_VERIFIED") {
      setMessage(`Gate pass ${selectedPass.gatePassNumber} cannot confirm exit. Current status: ${formatStatus(selectedPass.status)}`);
      setMessageType("warning");
      return;
    }

    try {
      setLoading(true);
      const updatedPass = await exit(selectedPass.id, { remarks });
      
      setSelectedPass(updatedPass);
      setRemarks("");

      setMessage(`Gate pass ${updatedPass.gatePassNumber} exit confirmed.`);
      setMessageType("success");
    } catch (err) {
      setMessage(`Failed to confirm exit: ${err.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const recordDispatch = async () => {
    if (!selectedPass) return;

    if (selectedPass.status !== "EXIT_CONFIRMED") {
      setMessage(`Gate pass ${selectedPass.gatePassNumber} cannot be recorded as dispatched. Current status: ${formatStatus(selectedPass.status)}`);
      setMessageType("warning");
      return;
    }

    try {
      setLoading(true);
      const updatedPass = await dispatch(selectedPass.id, { remarks });
      
      setSelectedPass(updatedPass);
      setRemarks("");

      setMessage(`Gate pass ${updatedPass.gatePassNumber} dispatch recorded.`);
      setMessageType("success");
    } catch (err) {
      setMessage(`Failed to record dispatch: ${err.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Security Verification</h1>
          <p>Verify gate passes and confirm goods exit.</p>
        </div>
      </div>

      <div className="form-card">
        <div className="search-bar" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Scan or enter Gate Pass Number (e.g. GP-00001)"
            value={gatePassNumber}
            onChange={(e) => setGatePassNumber(e.target.value)}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button className="primary-button" onClick={findGatePass} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {message && (
          <div className={`verification-message ${messageType}`}>
            {message}
          </div>
        )}
      </div>

      {selectedPass && (
        <div className="form-card" style={{ marginTop: "20px" }}>
          <h2>Gate Pass Details</h2>
          
          <div className="details-grid">
            {[
              ["Gate Pass", selectedPass.gatePassNumber],
              ["Issue Reference", selectedPass.issueVoucherNo],
              ["Vehicle", selectedPass.vehicleNumber],
              ["Driver", selectedPass.driverName],
              ["Destination", selectedPass.destination],
              ["Date", selectedPass.createdAt],
              ["Status", formatStatus(selectedPass.status)],
              ["Remarks", selectedPass.remarks],
            ].map(([label, value]) => (
              <div className="detail-item" key={label}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value || "Not provided"}</span>
              </div>
            ))}
          </div>

          {selectedPass.exitConfirmedAt && (
             <div className="detail-item" style={{ marginTop: "1rem" }}>
               <span className="detail-label">Exit Recorded At</span>
               <span className="detail-value">{new Date(selectedPass.exitConfirmedAt).toLocaleString()}</span>
             </div>
          )}

          <h3 style={{ marginTop: "30px", marginBottom: "15px" }}>Materials / Goods</h3>
          <div className="data-table-wrapper" style={{ marginBottom: "20px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th style={{ textAlign: "right" }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedPass.items && selectedPass.items.length > 0 ? (
                  selectedPass.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td style={{ textAlign: "right" }}>{item.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center" }}>No materials listed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Verification Action */}
          <div className="form-card" style={{ marginTop: "20px", border: "1px solid #e5e7eb", boxShadow: "none" }}>
            <div className="form-group full-width">
              <label>Add Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks..."
                disabled={loading}
              />
            </div>
            
            <div className="form-actions" style={{ marginTop: "16px" }}>
              {selectedPass.status === "CREATED" && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={verifyGatePass}
                  disabled={loading}
                >
                  Verify Gate Pass
                </button>
              )}
              
              {selectedPass.status === "SECURITY_VERIFIED" && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={confirmExit}
                  disabled={loading}
                >
                  Confirm Exit
                </button>
              )}

              {selectedPass.status === "EXIT_CONFIRMED" && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={recordDispatch}
                  disabled={loading}
                >
                  Record Dispatch
                </button>
              )}

              {["DISPATCH_RECORDED", "CANCELLED"].includes(selectedPass.status) && (
                <span className="status-badge">
                  Gate Pass Action Completed ({formatStatus(selectedPass.status)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityVerification;