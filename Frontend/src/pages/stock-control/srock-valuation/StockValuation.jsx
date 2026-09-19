import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../../components/common/PageHeader";
import EmptyState from "../../../components/common/EmptyState";
import { fetchResource } from "../../../api/masterData";
import { listValuation } from "./stockValuationData";
import StockValuationDetails from "./StockValuationDetails";

export default function StockValuation() {
  const [data, setData] = useState({ rows: [], totalValue: 0, costDataComplete: true });
  const [storeId, setStoreId] = useState("All");
  const [categoryId, setCategoryId] = useState("All");
  const [asOfDate, setAsOfDate] = useState("");
  
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [storesData, categoriesData, locationsData] = await Promise.all([
          fetchResource("stores"),
          fetchResource("categories"),
          fetchResource("locations")
        ]);
        setStores(storesData);
        setCategories(categoriesData);
        setLocations(locationsData);
      } catch (err) {
        console.error("Failed to load master data", err);
        setError("Failed to load filter data. Please check your permissions or network.");
      }
    }
    loadMasterData();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (storeId && storeId !== "All") params.storeId = storeId;
      if (categoryId && categoryId !== "All") params.categoryId = categoryId;
      if (asOfDate) params.asOfDate = asOfDate;

      const response = await listValuation(params);
      setData(response?.data || { rows: [], totalValue: 0, costDataComplete: true });
    } catch (caughtError) {
      setError(caughtError.message || "Failed to load stock valuation.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, storeId, asOfDate]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setStoreId("All");
    setCategoryId("All");
    setAsOfDate("");
  };

  const getLocationName = (id) => {
    const loc = locations.find(l => l.id === id);
    if (!loc) return id;
    const parts = [loc.code, loc.section, loc.bin].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : (loc.name || loc.code || id);
  };

  if (selectedRow) {
    return (
      <StockValuationDetails
        row={selectedRow}
        asOfDate={asOfDate}
        locationName={getLocationName(selectedRow.locationId)}
        onBack={() => setSelectedRow(null)}
      />
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Stock Valuation" 
        description="FIFO valuation based on actual transaction history." 
      />
      
      {/* Summary */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-card">
          <span className="summary-label">Total Inventory Value</span>
          <strong className="summary-value">
            {Number(data.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="toolbar-left" style={{ flexWrap: "wrap", gap: "10px" }}>
          <select 
            className="filter-select"
            value={storeId} 
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="All">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>

          <select 
            className="filter-select"
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>As of:</span>
            <input 
              type="date" 
              className="filter-select"
              value={asOfDate} 
              onChange={(e) => setAsOfDate(e.target.value)} 
            />
          </div>

          <button type="button" className="secondary-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {!data.costDataComplete && (
        <div className="error-message" style={{ background: "#fff3cd", color: "#856404", borderColor: "#ffeeba", padding: "16px", marginBottom: "16px", borderRadius: "4px" }}>
          <strong>⚠️ Incomplete Cost Data:</strong> Some FIFO layers have no recorded unit cost. The total valuation excludes these quantities. Please update purchase or receiving records to correct this.
        </div>
      )}

      {error && (
        <div className="error-message" style={{ color: "red", padding: "16px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>Loading valuation data...</div>
      ) : (
        <div className="data-card">
          {!data.rows || data.rows.length === 0 ? (
             <EmptyState
               title="No valuation data found"
               message="Try changing your filters or as-of date."
             />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Location</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Cost Complete</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={`${row.itemId}-${row.locationId}`}>
                      <td>{row.itemCode}</td>
                      <td>{row.itemName}</td>
                      <td>{getLocationName(row.locationId)}</td>
                      <td>{row.quantity}</td>
                      <td>{Number(row.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        {row.costDataComplete ? (
                          <span style={{ color: "green" }}>Yes</span>
                        ) : (
                          <span style={{ color: "red", fontWeight: "bold" }}>No</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedRow(row)}
                          >
                            View Layers
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
