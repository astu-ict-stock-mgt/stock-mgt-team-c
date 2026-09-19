import { useEffect, useMemo, useState } from "react";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import InspectionDetails from "./InspectionDetails";

import receivingService from "../../../services/receivingService";

function Inspection() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [selectedInspectionId, setSelectedInspectionId] = useState(null);

  useEffect(() => {
    async function loadInspections() {
      try {
        setLoading(true);
        setError("");
        
        const query = { page, limit: pagination.limit };
        if (search) query.search = search;
        if (statusFilter !== "All") query.status = statusFilter;

        const result = await receivingService.listInspections(query);
        setInspections(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } catch (err) {
        setError(err.message || "Failed to load inspections");
      } finally {
        setLoading(false);
      }
    }
    loadInspections();
  }, [page, pagination.limit, search, statusFilter]);

  function handleSearchChange(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleStatusChange(e) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  /*
   * =========================
   * DETAIL PAGE
   * =========================
   */

  if (selectedInspectionId) {
    return (
      <InspectionDetails
        inspectionId={selectedInspectionId}
        onBack={() => {
          setSelectedInspectionId(null);
          // Optional: we could refresh the list here if we want to reflect evaluation changes
        }}
      />
    );
  }

  /*
   * =========================
   * MAIN INSPECTION PAGE
   * =========================
   */

  return (
    <div className="master-page">
      <PageHeader
        title="Inspection"
        description="Inspect received goods before acceptance into inventory."
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search inspections..."
            aria-label="Search inspections"
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={handleStatusChange}
            aria-label="Filter by status"
          >
            <option value="All">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>
      
      <div className="master-result-summary">
        <span>
          Showing page <strong>{page}</strong> of <strong>{pagination.totalPages || 1}</strong> ({pagination.total} inspections total)
        </span>
      </div>

      <div className="data-card">
        {loading ? (
          <p style={{ padding: "20px", textAlign: "center" }}>Loading inspections...</p>
        ) : error ? (
          <p style={{ padding: "20px", textAlign: "center" }} className="form-error">Error: {error}</p>
        ) : inspections.length === 0 ? (
          <EmptyState
            title="No inspections found"
            message={search || statusFilter !== "All" ? "Try changing your search or filter." : "No inspections are currently available."}
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receiving Reference</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Inspector</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => {
                  const uiStatus = inspection.status === "PENDING" ? "Pending" : inspection.status;
                  return (
                    <tr key={inspection.id}>
                      <td>{inspection.goodsReceipt?.receiptNumber || "N/A"}</td>
                      <td>{inspection.goodsReceipt?.supplier?.name || "N/A"}</td>
                      <td>{inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}</td>
                      <td>{inspection.inspector?.fullName || "N/A"}</td>
                      <td>
                        <span
                          className={`status-badge ${uiStatus
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {uiStatus}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedInspectionId(inspection.id)}
                            aria-label={`View inspection ${inspection.goodsReceipt?.receiptNumber}`}
                          >
                            View
                          </button>
                        </div>
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
            aria-label="Previous page"
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
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
}

export default Inspection;