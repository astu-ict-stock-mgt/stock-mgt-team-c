import { useState, useEffect, useCallback } from "react";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";

import DispatchHistoryDetails from "./DispatchHistoryDetails";
import { listDispatches } from "./dispatchHistoryData";

function DispatchHistory() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const fetchDispatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // We send dateFilter as both start and end to filter that specific day
      // or we can just send it as startDate and let the user pick.
      // For a single date input, it makes sense to map to both start/end to get that day.
      const params = { 
        search, 
        status: statusFilter, 
        page, 
        limit: 20 
      };
      
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }
      
      const { data, pagination } = await listDispatches(params);
      
      setDispatches(data);
      setTotalPages(pagination.totalPages || 1);
      setTotalRecords(pagination.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load dispatches.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, page]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

  // When filters change, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("");
    setPage(1);
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  if (selectedDispatch) {
    return (
      <DispatchHistoryDetails
        dispatch={selectedDispatch}
        onBack={() => setSelectedDispatch(null)}
      />
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Dispatch History"
        description="Historical outgoing material movements."
      />

      {/* Summary */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-card">
          <span className="summary-label">
            Total Dispatches
          </span>
          <strong className="summary-value">
            {totalRecords}
          </strong>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search gate pass, voucher, driver, vehicle..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="DISPATCH_RECORDED">Dispatched</option>
          </select>

          <input
            type="date"
            className="filter-select"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />

          <button
            type="button"
            className="secondary-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ color: "red", padding: "16px" }}>{error}</div>}
      
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>Loading dispatch history...</div>
      ) : (
        <div className="data-card">
        {dispatches.length === 0 ? (
          <EmptyState
            title="No dispatches found"
            message="Try changing your search or filters."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gate Pass</th>
                  <th>Issue Reference</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Destination</th>
                  <th>Officer</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {dispatches.map((dispatch) => (
                  <tr key={dispatch.id}>
                    <td>{dispatch.gatePassNumber}</td>
                    <td>{dispatch.issueVoucherNo}</td>
                    <td>{dispatch.dispatchedAt}</td>
                    <td>{dispatch.vehicleNumber}</td>
                    <td>{dispatch.driverName}</td>
                    <td>{dispatch.destination}</td>
                    <td>{dispatch.securityOfficerName}</td>
                    <td>
                      <span className="status-badge">{dispatch.status}</span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => setSelectedDispatch(dispatch)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handlePreviousPage}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default DispatchHistory;