import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTransfers } from "../../../api/stockTransfers";

import "../StockPage.css";

function StockTransfers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const { records, pagination } = await fetchTransfers({ 
          page, 
          limit: 10, 
          search: debouncedSearch, 
          status: statusFilter 
        });
        
        if (!mounted) return;
        setTransfers(Array.isArray(records) ? records : []);
        setTotalPages(pagination?.totalPages || 1);
        setTotalRecords(pagination?.total || 0);
        setError("");
      } catch (err) {
        console.error("Unable to load transfers:", err);
        if (mounted) {
          setTransfers([]);
          setError(err.message || "Failed to load stock transfers.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [page, statusFilter, debouncedSearch]);

  /*
    Status class.
  */
  const getStatusClass = (status) => {
    switch (status) {
      case "DRAFT": return "status-inactive";
      case "SUBMITTED": return "status-pending";
      case "APPROVED": return "status-approved";
      case "COMPLETED": return "status-transferred";
      case "REJECTED": return "status-rejected";
      case "CANCELLED": return "status-rejected";
      default: return "status-active";
    }
  };

  return (
    <div className="stock-page">

      {/* PAGE HEADER */}

      <div className="stock-page-header">

        <div>
          <h1>Stock Transfers</h1>

          <p>
            Transfer materials between stores,
            locations and bins.
          </p>
        </div>

        <div className="stock-actions">

          <Link
            className="stock-button stock-button-primary"
            to="/stock-transfers/new"
          >
            + New Transfer
          </Link>

        </div>

      </div>

      {/* FILTERS */}

      <div className="stock-filters">

        <input
          className="stock-input"
          type="text"
          placeholder="Search transfer..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          className="stock-select"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
        >
          <option value="All">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

      </div>

      {error && <div className="danger-button" style={{ marginBottom: "20px" }}>{error}</div>}

      {/* TABLE */}
      {loading ? <p>Loading transfers...</p> : null}
      <div className="master-result-summary">

        <span>
          Showing{" "}
          <strong>
            {transfers.length}
          </strong>{" "}
          of{" "}
          <strong>
            {totalRecords}
          </strong>{" "}
          transfers
        </span>
      
      </div>
      <div className="stock-table-container">

        <table className="stock-table">

          <thead>

            <tr>
              <th>Transfer No.</th>
              <th>Date</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {transfers.length === 0 ? (

              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                  }}
                >
                  No stock transfers found.
                </td>
              </tr>

            ) : (

              transfers.map(
                (transfer) => (

                  <tr key={transfer.id}>

                    {/* TRANSFER NUMBER */}

                    <td>

                      <Link
                        className="stock-link"
                        to={`/stock-transfers/${transfer.id}`}
                      >
                        {transfer.transferNumber || transfer.id}
                      </Link>

                    </td>

                    {/* DATE */}

                    <td>
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </td>

                    {/* ITEM */}

                    <td>

                      {transfer.items?.[0]?.item?.name || "-"}
                      {transfer.items?.length > 1 && ` (+${transfer.items.length - 1} more)`}

                      <br />

                      <small>
                        {transfer.items?.[0]?.item?.code || "-"}
                      </small>

                    </td>

                    {/* QUANTITY */}

                    <td>
                      {transfer.items?.[0]?.quantity || 0}
                    </td>

                    {/* SOURCE */}

                    <td>

                      {transfer.sourceLocation?.store?.name || "-"}

                      <br />

                      <small>
                        Loc {transfer.sourceLocation?.code || "-"}
                      </small>

                    </td>

                    {/* DESTINATION */}

                    <td>

                      {transfer.destinationLocation?.store?.name || "-"}

                      <br />

                      <small>
                        Loc {transfer.destinationLocation?.code || "-"}
                      </small>

                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`stock-status ${getStatusClass(
                          transfer.status
                        )}`}
                      >
                        {transfer.status}
                      </span>

                    </td>

                    {/* ACTION */}

                    <td>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >

                        <Link
                          className="table-action"
                          to={`/stock-transfers/${transfer.id}`}
                        >
                          View
                        </Link>

                      </div>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>
      
      {transfers.length > 0 && (
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

export default StockTransfers;