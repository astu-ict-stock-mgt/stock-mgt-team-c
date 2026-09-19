import { useCallback, useEffect, useState, useRef } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { apiFetch } from "../../api/client";
import { fetchReport } from "./reportData";
import { reportColumns } from "./reportColumns";
import "./report.css";

const TYPES = [
  ["inventory", "Inventory"],
  ["movements", "Stock Movement"],
  ["receiving", "Receiving"],
  ["issues", "Issues"],
  ["procurement", "Procurement"],
  ["stock-taking", "Stock Taking"],
  ["disposals", "Disposals"],
  ["suppliers", "Suppliers"],
  ["audit", "Audit Log"],
];

const FILTER_CONFIG = {
  inventory: ["itemId", "storeId", "categoryId"],
  movements: ["startDate", "endDate", "itemId", "storeId", "categoryId", "userId", "transactionType"],
  receiving: ["startDate", "endDate", "supplierId"],
  issues: ["startDate", "endDate", "userId", "departmentId"],
  procurement: ["startDate", "endDate", "supplierId", "departmentId", "status"],
  "stock-taking": ["startDate", "endDate", "status"],
  disposals: ["startDate", "endDate", "itemId", "status"],
  suppliers: ["startDate", "endDate", "supplierId"],
  audit: ["startDate", "endDate", "userId"],
};

export default function Reports() {
  const [type, setType] = useState("inventory");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    storeId: "",
    departmentId: "",
    categoryId: "",
    itemId: "",
    userId: "",
    supplierId: "",
    transactionType: "",
    status: "",
  });

  const [masters, setMasters] = useState({
    items: [],
    stores: [],
    categories: [],
    departments: [],
    users: [],
    suppliers: [],
  });
  
  const [loadingData, setLoadingData] = useState(true);
  const [result, setResult] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef(0);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const response = await apiFetch("/reports/options");
        const options = response?.data || {};
        setMasters({
          items: options.items || [],
          stores: options.stores || [],
          categories: options.categories || [],
          departments: options.departments || [],
          users: options.users || [],
          suppliers: options.suppliers || [],
        });
      } catch (err) {
        console.error("Failed to load master data", err);
        setError("Failed to load filter options. You may lack permission.");
      } finally {
        setLoadingData(false);
      }
    }
    loadMasterData();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setResult({ data: [], pagination: {} });
  };

  const clearFilters = () => {
    setFilters({
      startDate: "", endDate: "", storeId: "", departmentId: "",
      categoryId: "", itemId: "", userId: "", supplierId: "",
      transactionType: "", status: "",
    });
  };

  const handleTypeChange = (e) => {
    setType(e.target.value);
    clearFilters();
    setResult({ data: [], pagination: {} });
  };

  const generate = useCallback(async (page = 1) => {
    const currentRequest = ++activeRequest.current;
    setLoading(true);
    setError("");

    try {
      const activeFilters = FILTER_CONFIG[type];
      const params = { page, limit: 50 };
      
      activeFilters.forEach(key => {
        if (filters[key]) params[key] = filters[key];
      });

      const response = await fetchReport(type, params);
      if (currentRequest !== activeRequest.current) return;

      let dataToSet = response?.data || { data: [], pagination: {} };
      if (!dataToSet.data && !dataToSet.pagination && Array.isArray(dataToSet)) {
        dataToSet = { data: dataToSet, pagination: {} };
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        dataToSet = response.data;
      } else if (response?.data?.report && Array.isArray(response.data.report)) {
        dataToSet = { data: response.data.report, pagination: response.data.pagination || {} };
      } else if (response?.report && Array.isArray(response.report)) {
        dataToSet = { data: response.report, pagination: response.pagination || {} };
      }

      if (type === "financial" && dataToSet.data && !Array.isArray(dataToSet.data)) {
        dataToSet.data = [dataToSet.data];
      }

      setResult(dataToSet);
    } catch (caughtError) {
      if (currentRequest !== activeRequest.current) return;
      setError(caughtError.message || "Failed to generate report.");
    } finally {
      if (currentRequest === activeRequest.current) {
        setLoading(false);
      }
    }
  }, [filters, type]);

  // Generate on mount or type change automatically (page 1)
  useEffect(() => {
    generate(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const columns = reportColumns[type] || [];

  const exportCsv = () => {
    if (!result.data || !result.data.length || columns.length === 0) return;
    const headers = columns.map(c => c.header);
    const csv = [
      headers.join(","),
      ...result.data.map((row) => columns.map((col) => {
        const rawValue = col.accessor(row);
        const value = typeof rawValue === "object" ? JSON.stringify(rawValue) : rawValue ?? "";
        return `"${String(value).replaceAll('"', '""')}"`;
      }).join(",")),
    ].join("\n");

    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    anchor.download = `${type}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const activeControls = FILTER_CONFIG[type] || [];

  return (
    <div className="page-container reports-workspace">
      <PageHeader title="System Reports" description="Generate and export server-authoritative stock reports." />
      
      <form className="toolbar" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px" }} onSubmit={(e) => { e.preventDefault(); generate(1); }}>
        <div style={{ flex: "1 1 100%" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Report Type</label>
          <select className="filter-select" value={type} onChange={handleTypeChange} style={{ maxWidth: "300px" }}>
            {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="toolbar-left" style={{ flexWrap: "wrap", gap: "12px", width: "100%" }}>
          
          {activeControls.includes("startDate") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>From Date</label>
              <input type="date" name="startDate" className="filter-select" value={filters.startDate} onChange={handleFilterChange} />
            </div>
          )}

          {activeControls.includes("endDate") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>To Date</label>
              <input type="date" name="endDate" className="filter-select" value={filters.endDate} onChange={handleFilterChange} />
            </div>
          )}

          {activeControls.includes("itemId") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Item</label>
              <select name="itemId" className="filter-select" value={filters.itemId} onChange={handleFilterChange}>
                <option value="">All Items</option>
                {masters.items.map(item => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
              </select>
            </div>
          )}

          {activeControls.includes("storeId") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Store</label>
              <select name="storeId" className="filter-select" value={filters.storeId} onChange={handleFilterChange}>
                <option value="">All Stores</option>
                {masters.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </div>
          )}

          {activeControls.includes("categoryId") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Category</label>
              <select name="categoryId" className="filter-select" value={filters.categoryId} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {masters.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          )}

          {activeControls.includes("departmentId") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Department</label>
              <select name="departmentId" className="filter-select" value={filters.departmentId} onChange={handleFilterChange}>
                <option value="">All Departments</option>
                {masters.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {activeControls.includes("supplierId") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Supplier</label>
              <select name="supplierId" className="filter-select" value={filters.supplierId} onChange={handleFilterChange}>
                <option value="">All Suppliers</option>
                {masters.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {activeControls.includes("userId") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>User</label>
              <select name="userId" className="filter-select" value={filters.userId} onChange={handleFilterChange}>
                <option value="">All Users</option>
                {masters.users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
              </select>
            </div>
          )}

          {activeControls.includes("transactionType") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Transaction Type</label>
              <select name="transactionType" className="filter-select" value={filters.transactionType} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="INBOUND">Inbound</option>
                <option value="OUTBOUND">Outbound</option>
                <option value="TRANSFER">Transfer</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="RETURN">Return</option>
              </select>
            </div>
          )}

          {activeControls.includes("status") && (
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>Status</label>
              <select name="status" className="filter-select" value={filters.status} onChange={handleFilterChange}>
                <option value="">All Statuses</option>
                {type === "procurement" ? (
                  <>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                ) : type === "stock-taking" ? (
                  <>
                    <option value="CREATED">Created</option>
                    <option value="COUNTING">Counting</option>
                    <option value="COUNTED">Counted</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ADJUSTED">Adjusted</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                ) : type === "disposals" ? (
                  <>
                    <option value="REQUESTED">Requested</option>
                    <option value="INSPECTED">Inspected</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DISPOSED">Disposed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REJECTED">Rejected</option>
                  </>
                )}
              </select>
            </div>
          )}

          <div className="action-buttons" style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginLeft: "auto" }}>
            <button type="button" className="secondary-button" onClick={clearFilters} disabled={loading || loadingData}>Clear Filters</button>
            <button type="button" className="primary-button" onClick={(e) => { e.preventDefault(); generate(1); }} disabled={loading || loadingData}>Generate</button>
            <button type="button" className="secondary-button" onClick={exportCsv} disabled={!result.data || !result.data.length || loading}>Export CSV</button>
            <button type="button" className="secondary-button" onClick={() => window.print()} disabled={!result.data || !result.data.length || loading}>Print</button>
          </div>
        </div>
      </form>

      {error && (
        <div className="error-message" style={{ color: "red", padding: "12px", marginBottom: "16px", background: "#fdf2f2", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      <div className="data-card" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        
        <div className="print-only-header" style={{ display: "none", paddingBottom: "20px", marginBottom: "20px", borderBottom: "2px solid #eee" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", color: "#111827" }}>
            {TYPES.find(t => t[0] === type)?.[1]} Report
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Generated on {new Date().toLocaleString()}
          </p>
        </div>

        {loading && (
          <div style={{ padding: "12px", textAlign: "center", color: "#666", fontSize: "14px", fontStyle: "italic", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            Updating report data...
          </div>
        )}
        {!result.data || !result.data.length ? (
          <EmptyState title="No data found" message="Try adjusting your filters to find records." />
        ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col, index) => (
                      <th key={index}>{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((col, colIndex) => {
                        const val = col.accessor(row);
                        return <td key={colIndex}>{String(val ?? "")}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </div>

      {result.pagination?.totalPages > 1 && (
        <div className="pagination" style={{ marginTop: "16px", display: "flex", justifyContent: "center", alignItems: "center", gap: "16px" }}>
          <button 
            type="button" 
            className="secondary-button"
            disabled={result.pagination.page <= 1} 
            onClick={() => generate(result.pagination.page - 1)}
          >
            Previous
          </button>
          <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
          <button 
            type="button" 
            className="secondary-button"
            disabled={result.pagination.page >= result.pagination.totalPages} 
            onClick={() => generate(result.pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
