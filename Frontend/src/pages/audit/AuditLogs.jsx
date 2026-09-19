import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { list, getAuditUsers } from "./auditData";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  
  const [users, setUsers] = useState([]);
  
  const [draftFilters, setDraftFilters] = useState({
    userId: "",
    action: "",
    resource: "",
    resourceId: "",
    startDate: "",
    endDate: ""
  });
  
  const [appliedFilters, setAppliedFilters] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userError, setUserError] = useState("");

  useEffect(() => {
    getAuditUsers()
      .then(res => setUsers(res?.data || []))
      .catch(err => setUserError("Failed to load users for filter."));
  }, []);

  const load = useCallback(async (page = 1, filtersToUse = appliedFilters) => {
    setLoading(true);
    setError("");

    try {
      const params = { ...filtersToUse, page, limit: 25 };
      // Strip empty values
      Object.keys(params).forEach(k => {
        if (params[k] === "") delete params[k];
      });

      const response = await list(params);
      setLogs(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch (caughtError) {
      setError(caughtError.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  // Initial load
  useEffect(() => {
    load(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    load(1, draftFilters);
  };

  const handleClearFilters = () => {
    const empty = { userId: "", action: "", resource: "", resourceId: "", startDate: "", endDate: "" };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    load(1, empty);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDraftFilters(prev => ({ ...prev, [name]: value }));
  };

  const renderMetadata = (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) return <span style={{ color: "#999" }}>-</span>;
    return (
      <div style={{ fontSize: "12px", background: "#f8f9fa", padding: "8px", borderRadius: "4px", border: "1px solid #e9ecef" }}>
        {Object.entries(metadata).map(([k, v]) => (
          <div key={k}><strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-container">
      <PageHeader title="Audit Logs" description="Authoritative server-side audit history. Records are read-only." />

      <div className="toolbar" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div className="toolbar-left" style={{ flexWrap: "wrap", gap: "12px", width: "100%" }}>
          
          <div>
            <label htmlFor="filter-userId" style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>User</label>
            {userError ? (
              <div style={{ fontSize: "12px", color: "red", padding: "8px", border: "1px solid red", borderRadius: "4px" }}>{userError}</div>
            ) : (
              <select id="filter-userId" name="userId" className="filter-select" value={draftFilters.userId} onChange={handleChange}>
                <option value="">All Users</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="filter-action" style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Action</label>
            <input id="filter-action" type="text" name="action" className="filter-select" placeholder="e.g. CREATE" value={draftFilters.action} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="filter-resource" style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Resource</label>
            <input id="filter-resource" type="text" name="resource" className="filter-select" placeholder="e.g. Item" value={draftFilters.resource} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="filter-resourceId" style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Resource ID</label>
            <input id="filter-resourceId" type="text" name="resourceId" className="filter-select" placeholder="UUID" value={draftFilters.resourceId} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="filter-startDate" style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>From Date</label>
            <input id="filter-startDate" type="date" name="startDate" className="filter-select" value={draftFilters.startDate} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="filter-endDate" style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>To Date</label>
            <input id="filter-endDate" type="date" name="endDate" className="filter-select" value={draftFilters.endDate} onChange={handleChange} />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginLeft: "auto" }}>
            <button type="button" className="secondary-button" onClick={handleClearFilters} disabled={loading}>Clear</button>
            <button type="button" className="primary-button" onClick={handleApplyFilters} disabled={loading}>Filter</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ color: "red", padding: "12px", marginBottom: "16px", background: "#fdf2f2", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>Fetching audit records...</div>
      ) : (
        <div className="data-card">
          {!logs.length ? (
            <EmptyState title="No audit logs found" message="Try adjusting your filters or date range." />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.actor?.fullName || log.actor?.username || "System"}</td>
                      <td><span className="report-status-badge">{log.action}</span></td>
                      <td>
                        {log.resource || "-"}
                        {log.resourceId && <div style={{ fontSize: "11px", color: "#666" }}>ID: {log.resourceId}</div>}
                      </td>
                      <td>{log.method || "-"}</td>
                      <td>{log.path || "-"}</td>
                      <td>{renderMetadata(log.metadata)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="pagination" style={{ marginTop: "16px", display: "flex", justifyContent: "center", alignItems: "center", gap: "16px" }}>
          <button 
            type="button" 
            className="secondary-button"
            disabled={pagination.page <= 1} 
            onClick={() => load(pagination.page - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button 
            type="button" 
            className="secondary-button"
            disabled={pagination.page >= pagination.totalPages} 
            onClick={() => load(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
