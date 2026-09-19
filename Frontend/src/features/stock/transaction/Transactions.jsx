import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getPaginatedTransactions } from "../../../api/inventory";
import "../StockPage.css";

function Transactions() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when type changes
  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => {
    let mounted = true;

    async function loadTransactions() {
      try {
        setLoading(true);
        const res = await getPaginatedTransactions({ page, limit: 10, type: typeFilter, search: debouncedSearch });
        if (!mounted) return;
        setTransactions(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);
        setError("");
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || "Unable to load stock transactions.");
        setTransactions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTransactions();
    return () => { mounted = false; };
  }, [page, typeFilter, debouncedSearch]);

  return (
    <div className="stock-page">
      <div className="stock-page-header">
        <div>
          <h1>Inventory Transactions</h1>
          <p>Complete history of database-backed inventory movements and supporting documents.</p>
        </div>
      </div>

      {error && <div className="danger-button" style={{ marginBottom: "20px" }}>{error}</div>}

      <div className="stock-filters">
        <input className="stock-input" type="text" placeholder="Search transaction..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="stock-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="All">All Types</option>
          <option value="INBOUND">Receipt (Inbound)</option>
          <option value="OUTBOUND">Issue (Outbound)</option>
          <option value="TRANSFER">Transfer</option>
          <option value="RETURN">Return</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>

      <div className="master-result-summary">
        <span>
          Showing <strong>{transactions.length}</strong> of <strong>{totalRecords}</strong> transactions
        </span>
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Date</th>
              <th>Type</th>
              <th>Document</th>
              <th>Item</th>
              <th>Direction</th>
              <th>Quantity</th>
              <th>Store</th>
              <th>User</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ textAlign: "center", padding: "30px" }}>Loading transactions...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: "center", padding: "30px" }}>No transactions found.</td></tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td><Link className="stock-link" to={`/transactions/${transaction.id}`}>{transaction.transactionNumber}</Link></td>
                  <td>{transaction.date}</td>
                  <td>{transaction.type}</td>
                  <td>{transaction.document}</td>
                  <td>
                    {transaction.itemName}
                    <br />
                    <small>{transaction.itemCode}</small>
                  </td>
                  <td>{transaction.direction}</td>
                  <td>{String(transaction.quantity)}</td>
                  <td>{transaction.store}</td>
                  <td>{transaction.user}</td>
                  <td>
                    <Link className="table-action" to={`/transactions/${transaction.id}`}>View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {transactions.length > 0 && (
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

export default Transactions;