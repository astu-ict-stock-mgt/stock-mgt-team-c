import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import binCardService from "../../../services/binCardService";
import "../StockPage.css";

function BinCards() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    async function loadBinCards() {
      try {
        setLoading(true);
        const res = await binCardService.list({ page, limit: 10, search: debouncedSearch });
        if (!mounted) return;
        setRecords(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);
        setError("");
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || "Unable to load bin cards.");
        setRecords([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBinCards();
    return () => { mounted = false; };
  }, [page, debouncedSearch]);

  return (
    <div className="stock-page">
      <div className="stock-page-header">
        <div>
          <h1>Bin Cards</h1>
          <p>Live location and bin-level movement history from the database.</p>
        </div>
      </div>

      {error && <div className="danger-button" style={{ marginBottom: "20px" }}>{error}</div>}

      <div className="stock-filters">
        <input 
          className="stock-input" 
          placeholder="Search item, location, or reference..." 
          value={search} 
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search bin cards by item, location or reference"
        />
      </div>

      <div className="master-result-summary">
        <span>Showing <strong>{records.length}</strong> of <strong>{totalRecords}</strong> bin card entries</span>
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Bin / Location</th>
              <th>Date</th>
              <th>Inbound</th>
              <th>Outbound</th>
              <th>Balance</th>
              <th>Reference</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "30px" }}>Loading bin cards...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "30px" }}>No bin card data available.</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>
                    {record.item?.name}
                    <br />
                    <small>{record.item?.code}</small>
                  </td>
                  <td>{record.location?.code}</td>
                  <td>{String(record.transactionDate || record.createdAt).slice(0, 10)}</td>
                  <td>{String(record.quantityIn)}</td>
                  <td>{String(record.quantityOut)}</td>
                  <td>{String(record.balance)}</td>
                  <td>
                    {record.transaction?.transactionNumber || "N/A"} 
                    <br />
                    <small>({record.transaction?.referenceType || "DIRECT"})</small>
                  </td>
                  <td>
                    {record.location?.id && record.item?.id && (
                      <Link 
                        to={`/bin-cards/${record.location.id}?itemId=${record.item.id}`} 
                        className="secondary-button" 
                        style={{ textDecoration: 'none' }}
                      >
                        View History
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {records.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="action-button"
          >
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Page {page} of {totalPages}</span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="action-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default BinCards;