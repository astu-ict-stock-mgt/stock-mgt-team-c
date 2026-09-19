import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchRequisitions } from "../../../api/requisition";
import AuthContext from "../../../context/AuthContext";

import "./requisitions.css";

function Requisitions() {
  const { hasPermission } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadRequisitions() {
      setLoading(true);
      setError("");

      try {
        const result = await fetchRequisitions({
          search,
          status: statusFilter === "all" ? "All" : statusFilter,
          page,
          limit: 20
        });

        if (!ignore) {
          if (result.pagination) {
            setRequisitions(result.data);
            setTotalPages(result.pagination.totalPages || 1);
          } else {
            setRequisitions(result.data || result);
            setTotalPages(1);
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || "Unable to load requisitions.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRequisitions();

    return () => {
      ignore = true;
    };
  }, [search, statusFilter, page]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatusFilter(event.target.value);
    setPage(1);
  }

  const canCreate = hasPermission("create_requisition");

  return (
    <div className="requisition-page">
      <div className="page-header">
        <div>
          <h1>Store Requisitions</h1>
          <p>Create, submit, and manage material requisitions.</p>
        </div>

        {canCreate && (
          <Link to="/requisitions/new" className="primary-button">
            + New Requisition
          </Link>
        )}
      </div>

      <div className="page-header">
        <h2>All Requisitions</h2>

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search requisitions..."
            value={search}
            onChange={handleSearchChange}
          />

          <select value={statusFilter} onChange={handleStatusChange}>
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <p>Loading requisitions...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request No.</th>
                    <th>Requester</th>
                    <th>Department</th>
                    <th>Store</th>
                    <th>Required Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No requisitions found.</td>
                    </tr>
                  ) : (
                    requisitions.map((requisition) => (
                      <tr key={requisition.id}>
                        <td>
                          <strong>{requisition.requisitionNo || requisition.id}</strong>
                        </td>
                        <td>{requisition.requester || "-"}</td>
                        <td>{requisition.department || "-"}</td>
                        <td>{requisition.store || "-"}</td>
                        <td>{requisition.requiredDate ? new Date(requisition.requiredDate).toLocaleDateString() : "-"}</td>
                        <td>
                          <span className={`status status-${(requisition.status || "draft").toLowerCase().replaceAll(" ", "-")}`}>
                            {requisition.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link to={`/requisitions/${requisition.id}`} className="table-action">
                              View
                            </Link>
                            {hasPermission("update_requisition") && requisition.status === "Draft" && (
                              <Link to={`/requisitions/${requisition.id}/edit`} className="table-action">
                                Edit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls" style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button
                  className="secondary-button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  className="secondary-button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Requisitions;