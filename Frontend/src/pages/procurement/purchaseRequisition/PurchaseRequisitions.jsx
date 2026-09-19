import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AuthContext from "../../../context/AuthContext";
import EmptyState from "../../../components/common/EmptyState";
import SearchBar from "../../../components/common/SearchBar";
import {
  fetchPurchaseRequisitions,
  displayPurchaseRequisitionStatus,
} from "../../../api/purchaseRequisition";

import "./purchaseRequisitions.css";

const STATUS_OPTIONS = [
  ["DRAFT", "Draft"],
  ["PENDING_APPROVAL", "Pending Approval"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["ORDERED", "Ordered"],
  ["PARTIALLY_RECEIVED", "Partially Received"],
  ["RECEIVED", "Received"],
  ["CANCELLED", "Cancelled"],
];

function PurchaseRequisitions() {
  const { hasPermission } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await fetchPurchaseRequisitions({
          search,
          status,
          page,
          limit: 20,
        });

        if (!active) return;
        setRecords(result.data);
        setPagination(result.pagination || { total: result.data.length, totalPages: 1 });
      } catch (loadError) {
        if (!active) return;
        setRecords([]);
        setError(loadError.message || "Unable to load purchase requisitions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [search, status, page]);

  const canCreate = hasPermission("create_purchase_requisition");

  const visibleCountLabel = useMemo(() => {
    if (!pagination.total) return "0 purchase requisitions";
    return `${pagination.total} purchase requisition${pagination.total === 1 ? "" : "s"}`;
  }, [pagination.total]);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  return (
    <div className="purchase-requisition-page">
      <div className="purchase-requisition-header">
        <div>
          <h1>Purchase Requisitions</h1>
          <p>Create and manage requests for materials that must be procured.</p>
        </div>

        {canCreate && (
          <Link to="/Procurement-requisitions/new" className="primary-button">
            + New Purchase Requisition
          </Link>
        )}
      </div>

      <div className="purchase-requisition-toolbar">
        <div className="purchase-requisition-filters">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search request no., requester, department, or purpose..."
          />
          <select value={status} onChange={handleStatusChange} className="filter-select">
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <span className="purchase-requisition-count">{visibleCountLabel}</span>
      </div>

      <div className="purchase-requisition-panel">
        {loading ? (
          <div className="purchase-requisition-state">Loading purchase requisitions...</div>
        ) : error ? (
          <EmptyState title="Unable to load purchase requisitions" message={error} />
        ) : records.length === 0 ? (
          <EmptyState
            title="No purchase requisitions found"
            message={search || status !== "All" ? "Try changing the search or status filter." : "No purchase requisitions have been created yet."}
          />
        ) : (
          <div className="item-table-wrapper">
            <table className="item-table purchase-requisition-list-table">
              <thead>
                <tr>
                  <th>Request No.</th>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Required Date</th>
                  <th>Items</th>
                  <th>Estimated Cost</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.requestNumber}</strong></td>
                    <td>{record.requester || "—"}</td>
                    <td>{record.department || "—"}</td>
                    <td>{record.requiredDate ? new Date(record.requiredDate).toLocaleDateString() : "—"}</td>
                    <td>{record.items.length}</td>
                    <td>
                      {record.estimatedCost > 0
                        ? record.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "—"}
                    </td>
                    <td>
                      <span className={`purchase-status purchase-status-${record.status.toLowerCase()}`}>
                        {displayPurchaseRequisitionStatus(record.status)}
                      </span>
                    </td>
                    <td>
                      <div className="purchase-requisition-actions">
                        <Link to={`/Procurement-requisitions/${record.id}`} className="table-action">
                          View
                        </Link>
                        {hasPermission("update_purchase_requisition") && ["DRAFT", "REJECTED"].includes(String(record.status).toUpperCase()) && (
                          <Link to={`/Procurement-requisitions/${record.id}/edit`} className="table-action">
                            Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && pagination.totalPages > 1 && (
          <div className="purchase-requisition-pagination">
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button
              type="button"
              className="secondary-button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseRequisitions;
