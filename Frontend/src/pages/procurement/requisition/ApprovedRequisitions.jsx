import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchRequisitions } from "../../../api/requisition";

import "./requisitions.css";

function ApprovedRequisitions() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let ignore = false;

    async function loadApproved() {
      setLoading(true);
      try {
        const result = await fetchRequisitions({ status: "Approved", page, limit: 10 });
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
          setError(loadError.message || "Unable to load approved requisitions.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadApproved();

    return () => {
      ignore = true;
    };
  }, [page]);

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  return (
    <div className="requisition-page">
      <div className="page-header">
        <div>
          <h1>Approved Requisitions</h1>
          <p>Requisitions ready for issue or procurement.</p>
        </div>
      </div>

      <div className="table-card data-table-wrapper">
        {error && <p className="error-message">{error}</p>}
        {loading ? (
          <p>Loading approved requisitions...</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request No.</th>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Required Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No approved requisitions.</td>
                  </tr>
                ) : (
                  requisitions.map((requisition) => (
                    <tr key={requisition.id}>
                      <td>
                        <strong>{requisition.requisitionNo || requisition.id}</strong>
                      </td>
                      <td>{requisition.requester || "-"}</td>
                      <td>{requisition.department || "-"}</td>
                      <td>{requisition.requiredDate ? new Date(requisition.requiredDate).toLocaleDateString() : "-"}</td>
                      <td>
                        <div className="table-actions">
                          <Link className="table-link" to={`/requisitions/${requisition.id}`}>
                            View Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="secondary-button"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  className="secondary-button"
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

export default ApprovedRequisitions;
