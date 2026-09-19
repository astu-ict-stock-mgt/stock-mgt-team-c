import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import PageHeader from "../../../components/common/PageHeader";
import EmptyState from "../../../components/common/EmptyState";
import receivingService from "../../../services/receivingService";

function GRN() {
  const [grns, setGrns] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

  useEffect(() => {
    async function loadGRNs() {
      try {
        setLoading(true);
        setError("");
        
        const query = { page, limit: pagination.limit };
        if (search) query.search = search;
        
        const result = await receivingService.listGRNs(query);
        setGrns(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
    
    // We use a small debounce effect natively here by just tying it to state
    // But since search is direct, we'll let it fetch on every change, or we could add a timer if requested.
    // The prompt says "Do not create unnecessary debounce infrastructure unless required."
    // So we'll just run it directly.
    const timer = setTimeout(() => {
      loadGRNs();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, pagination.limit, search]);

  function handleSearchChange(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  return (
    <div className="master-page">
      <PageHeader title="Goods Receiving Notes" description="Persisted GRNs generated from approved receipts." />
      
      <div className="toolbar">
        <input 
          value={search} 
          onChange={handleSearchChange} 
          placeholder="Search GRN, receipt or supplier..." 
        />
      </div>
      
      <div className="master-result-summary">
        <span>
          Showing page <strong>{page}</strong> of <strong>{pagination.totalPages || 1}</strong> ({pagination.total} records total)
        </span>
      </div>
      
      <div className="data-card">
        {loading ? (
          <p style={{ padding: "20px", textAlign: "center" }}>Loading GRNs...</p>
        ) : error ? (
          <p style={{ padding: "20px", textAlign: "center" }} className="form-error">Error: {error}</p>
        ) : grns.length === 0 ? (
          <EmptyState 
            title="No GRNs found" 
            message={search ? "Try changing your search criteria." : "Approved receipts will appear here after GRN generation."} 
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>Receipt</th>
                  <th>Supplier</th>
                  <th>Store</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => {
                  const uiStatus = grn.status === "ACTIVE" ? "Active" : grn.status;
                  return (
                    <tr key={grn.id}>
                      <td>{grn.grnNumber}</td>
                      <td>{grn.goodsReceipt?.receiptNumber || "N/A"}</td>
                      <td>{grn.supplier?.name || "N/A"}</td>
                      <td>{grn.store?.name || "N/A"}</td>
                      <td>{String(grn.grnDate).slice(0, 10)}</td>
                      <td>
                        <span className={`status-badge ${uiStatus.toLowerCase().replaceAll(" ", "-")}`}>
                          {uiStatus}
                        </span>
                      </td>
                      <td>
                        <Link className="table-action" to={`/grn/${grn.id}`}>View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          <button 
            className="secondary-button" 
            disabled={page <= 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button 
            className="secondary-button" 
            disabled={page >= pagination.totalPages} 
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default GRN;
