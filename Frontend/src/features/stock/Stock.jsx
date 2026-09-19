import { useEffect, useState, useContext } from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { getPaginatedInventory, getPaginatedTransactions } from "../../api/inventory";
import AuthContext from "../../context/AuthContext";
import PERMISSIONS from "../../config/permissions";

function Stock() {
  const { hasPermission } = useContext(AuthContext);
  const canViewTransactions = hasPermission(PERMISSIONS.VIEW_STOCK_TRANSACTIONS);

  const [balanceSearch, setBalanceSearch] = useState("");
  const [balancesPage, setBalancesPage] = useState(1);
  const [balancesTotalPages, setBalancesTotalPages] = useState(1);
  const [balances, setBalances] = useState([]);
  const [globalSummary, setGlobalSummary] = useState({ totalItems: 0, availableStock: 0, lowStockItems: 0 });
  const [balancesLoading, setBalancesLoading] = useState(true);

  const [transactionSearch, setTransactionSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState("All");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [recentMovements, setRecentMovements] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [balancesError, setBalancesError] = useState("");
  const [transactionsError, setTransactionsError] = useState("");

  // Debounced balance search to avoid spamming the backend
  const [debouncedBalanceSearch, setDebouncedBalanceSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBalanceSearch(balanceSearch);
      setBalancesPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [balanceSearch]);

  // Debounced transaction search
  const [debouncedTransactionSearch, setDebouncedTransactionSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTransactionSearch(transactionSearch);
      setTransactionsPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [transactionSearch]);

  useEffect(() => {
    let mounted = true;
    async function loadBalances() {
      try {
        setBalancesLoading(true);
        setBalancesError("");
        const { data, pagination, summary } = await getPaginatedInventory({
          page: balancesPage,
          limit: 10,
          search: debouncedBalanceSearch,
        });

        if (!mounted) return;
        setBalances(data);
        setBalancesTotalPages(pagination.totalPages || 1);
        setGlobalSummary(summary);
      } catch (err) {
        if (mounted) setBalancesError(err.message || "Unable to load inventory balances.");
      } finally {
        if (mounted) setBalancesLoading(false);
      }
    }
    loadBalances();
    return () => { mounted = false; };
  }, [balancesPage, debouncedBalanceSearch]);

  useEffect(() => {
    if (!canViewTransactions) {
      setTransactionsLoading(false);
      return;
    }

    let mounted = true;
    async function loadTransactions() {
      try {
        setTransactionsLoading(true);
        setTransactionsError("");
        
        const backendTypeMap = {
          "Receipt": "INBOUND",
          "Issue": "OUTBOUND",
          "Transfer": "TRANSFER",
          "Return": "RETURN",
          "Adjustment": "ADJUSTMENT"
        };
        const apiType = movementFilter === "All" ? undefined : backendTypeMap[movementFilter];

        const { data, pagination } = await getPaginatedTransactions({
          page: transactionsPage,
          limit: 10,
          search: debouncedTransactionSearch,
          type: apiType,
        });

        if (!mounted) return;
        setRecentMovements(data);
        setTransactionsTotalPages(pagination.totalPages || 1);
      } catch (err) {
        if (mounted) setTransactionsError(err.message || "Unable to load inventory transactions.");
      } finally {
        if (mounted) setTransactionsLoading(false);
      }
    }
    loadTransactions();
    return () => { mounted = false; };
  }, [transactionsPage, debouncedTransactionSearch, movementFilter, canViewTransactions]);

  const clearFilters = () => {
    setTransactionSearch("");
    setMovementFilter("All");
    setTransactionsPage(1);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Overview"
        description="Monitor live stock balances, movement activity, and inventory status from the database."
      />

      {balancesError && (
        <div className="danger-button" style={{ marginBottom: "20px" }}>{balancesError}</div>
      )}

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Items</span>
          <strong className="summary-value">{balancesLoading ? "-" : globalSummary.totalItems}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Available Stock</span>
          <strong className="summary-value">{balancesLoading ? "-" : globalSummary.availableStock}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Low Stock Items</span>
          <strong className="summary-value">{balancesLoading ? "-" : globalSummary.lowStockItems}</strong>
        </div>
      </div>

      <div className="data-card" style={{ marginTop: "20px" }}>
        <div className="page-header">
          <div>
            <h2>Current stock status</h2>
            <p>Live inventory balances from PostgreSQL.</p>
          </div>
          <div>
            <SearchBar value={balanceSearch} onChange={setBalanceSearch} placeholder="Search item..." />
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Code</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>Reorder Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {balancesLoading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>Loading stock...</td></tr>
              ) : balances.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>No inventory balances found.</td></tr>
              ) : (
                balances.map((item) => (
                  <tr key={item.id || `${item.itemCode}-${item.locationId}`}>
                    <td>{item.itemName}</td>
                    <td>{item.itemCode}</td>
                    <td>{item.locationLabel}</td>
                    <td>{item.quantity}</td>
                    <td>{item.reorder}</td>
                    <td>
                      <span className={`status-badge status-${item.status.toLowerCase().replaceAll(" ", "-")}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls for Balances */}
        {balances.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button 
              disabled={balancesPage === 1} 
              onClick={() => setBalancesPage(p => Math.max(1, p - 1))}
              className="action-button"
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Page {balancesPage} of {balancesTotalPages}</span>
            <button 
              disabled={balancesPage >= balancesTotalPages} 
              onClick={() => setBalancesPage(p => p + 1)}
              className="action-button"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {canViewTransactions && (
        <div className="data-card" style={{ marginTop: "20px" }}>
          <div className="page-header">
            <div>
              <h2>Recent inventory movements</h2>
              <p>Latest inventory transactions from the database.</p>
            </div>
          </div>

          {transactionsError && (
            <div className="danger-button" style={{ margin: "0 20px 20px" }}>{transactionsError}</div>
          )}

          <div className="page-toolbar" style={{ padding: "0 20px", marginBottom: "20px" }}>
            <SearchBar value={transactionSearch} onChange={setTransactionSearch} placeholder="Search movement..." />
            <select value={movementFilter} onChange={(event) => { setMovementFilter(event.target.value); setTransactionsPage(1); }} className="select-input">
              <option value="All">All movements</option>
              <option value="Receipt">Receipt</option>
              <option value="Issue">Issue</option>
              <option value="Transfer">Transfer</option>
              <option value="Return">Return</option>
              <option value="Adjustment">Adjustment</option>
            </select>
          </div>

          {transactionsLoading ? (
             <div style={{ textAlign: "center", padding: "24px" }}>Loading transactions...</div>
          ) : recentMovements.length === 0 ? (
            <EmptyState 
              title="No movements found" 
              description="No database-backed inventory movement matches your filters." 
              actionLabel="Clear filters" 
              onAction={clearFilters} 
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Movement</th>
                    <th>Quantity</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.date}</td>
                      <td>{movement.itemName}</td>
                      <td>{movement.type}</td>
                      <td>{movement.quantity}</td>
                      <td>{movement.document}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls for Transactions */}
          {recentMovements.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                disabled={transactionsPage === 1} 
                onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                className="action-button"
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Page {transactionsPage} of {transactionsTotalPages}</span>
              <button 
                disabled={transactionsPage >= transactionsTotalPages} 
                onClick={() => setTransactionsPage(p => p + 1)}
                className="action-button"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Stock;