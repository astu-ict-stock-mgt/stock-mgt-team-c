import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchDisposals } from "../../api/disposal";

import "./control.css";

function Disposal() {
  const [disposals, setDisposals] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchDisposals();
        if (mounted) {
          setDisposals(data || []);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load disposal requests.");
        }
        console.error("Failed to fetch disposals:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredDisposals = disposals.filter((disposal) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      disposal.requestNumber?.toLowerCase().includes(searchValue) ||
      disposal.item?.name?.toLowerCase()?.includes(searchValue) ||
      disposal.item?.code?.toLowerCase()?.includes(searchValue) ||
      disposal.location?.code?.toLowerCase()?.includes(searchValue);

    const matchesStatus =
      status === "All" ||
      disposal.status === status;

    return matchesSearch && matchesStatus;
  });

  const pendingInspection = disposals.filter(
    (item) => item.status === "REQUESTED"
  ).length;

  const pendingApproval = disposals.filter(
    (item) => item.status === "INSPECTED"
  ).length;

  const approved = disposals.filter(
    (item) => item.status === "APPROVED"
  ).length;

  const disposed = disposals.filter(
    (item) => item.status === "COMPLETED"
  ).length;

  const getStatusClass = (value) =>
    `status-${value.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="control-page">
      <div className="page-header">
        <div>
          <h1>Disposal Management</h1>
          <p>
            Manage damaged, obsolete and disposal inventory requests.
          </p>
        </div>

        <Link to="/disposal/new" className="primary-button">
          + New Disposal Request
        </Link>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <div className="monitor-summary">
        <div className="monitor-card danger">
          <span>Pending Inspection</span>
          <strong>{pendingInspection}</strong>
        </div>

        <div className="monitor-card">
          <span>Pending Approval</span>
          <strong>{pendingApproval}</strong>
        </div>

        <div className="monitor-card">
          <span>Approved</span>
          <strong>{approved}</strong>
        </div>

        <div className="monitor-card">
          <span>Disposed</span>
          <strong>{disposed}</strong>
        </div>

        <div className="monitor-card">
          <span>Total Requests</span>
          <strong>{disposals.length}</strong>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search request, item, code or store..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="All">All Status</option>
          <option value="REQUESTED">REQUESTED</option>
          <option value="INSPECTED">INSPECTED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Request</th>
              <th>Item</th>
              <th>Code</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Store</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>
                  Loading disposal requests...
                </td>
              </tr>
            ) : filteredDisposals.length === 0 ? (
              <tr>
                <td colSpan="9">No disposal requests found.</td>
              </tr>
            ) : (
              filteredDisposals.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.requestNumber}</strong>
                  </td>
                  <td>{request.item?.name}</td>
                  <td>{request.item?.code}</td>
                  <td>{request.quantity}</td>
                  <td>{request.reason}</td>
                  <td>{request.location?.code}</td>
                  <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <Link className="table-action" to={`/disposal/${request.id}`}>
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Disposal;