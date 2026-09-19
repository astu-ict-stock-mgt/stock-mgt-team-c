import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import stockCardService from "../../../services/stockCardService";
import { fetchResource } from "../../../api/masterData";
import "../StockPage.css";

function StockCards() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadLocations() {
      try {
        const data = await fetchResource("locations");
        if (mounted) setLocations(data);
      } catch (err) {
        console.error("Failed to load locations", err);
      }
    }
    loadLocations();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    async function loadStockCards() {
      try {
        setLoading(true);
        const res = await stockCardService.list({ 
          page, 
          limit: 10, 
          search: debouncedSearch,
          ...(locationId && { locationId })
        });
        if (!mounted) return;
        setRecords(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);
        setError("");
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || "Unable to load stock cards.");
        setRecords([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStockCards();
    return () => { mounted = false; };
  }, [page, debouncedSearch, locationId]);

  return (
    <div className="stock-page">
      <div className="stock-page-header">
        <div>
          <h1>Stock Cards</h1>
          <p>Live stock movement history from the PostgreSQL inventory ledger.</p>
        </div>
      </div>

      {error && <div className="danger-button" style={{ marginBottom: "20px" }}>{error}</div>}

      <div className="stock-filters" style={{ display: 'flex', gap: '10px' }}>
        <input 
          className="stock-input" 
          placeholder="Search item or reference..." 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
          aria-label="Search items or transaction references"
          style={{ flex: 1 }}
        />
        <select 
          className="stock-input" 
          value={locationId} 
          onChange={(e) => { setLocationId(e.target.value); setPage(1); }}
          aria-label="Filter by location"
          style={{ width: '200px' }}
        >
          <option value="">All Locations</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div className="master-result-summary">
        <span>Showing <strong>{records.length}</strong> of <strong>{totalRecords}</strong> stock card entries</span>
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Location</th>
              <th>Date</th>
              <th>Document</th>
              <th>Transaction Type</th>
              <th>Qty In</th>
              <th>Qty Out</th>
              <th>Running Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: "center", padding: "30px" }}>Loading stock card entries...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: "center", padding: "30px" }}>No stock card data available.</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>
                    {record.item?.name}
                    <br />
                    <small>{record.item?.code}</small>
                  </td>
                  <td>{record.location?.name || record.location?.code || "Unknown"}</td>
                  <td>{String(record.transactionDate || record.createdAt).slice(0, 10)}</td>
                  <td>{record.transaction?.referenceType || "DIRECT"} {record.transaction?.referenceId || ""}</td>
                  <td>{record.transactionType}</td>
                  <td>{String(record.quantityIn)}</td>
                  <td>{String(record.quantityOut)}</td>
                  <td>{String(record.balance)}</td>
                  <td>
                    {record.item?.id && (
                      <Link 
                        to={`/stock-cards/${record.item.id}?locationId=${record.locationId}`} 
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

export default StockCards;