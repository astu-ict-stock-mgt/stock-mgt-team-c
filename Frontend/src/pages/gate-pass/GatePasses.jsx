import { useMemo, useState, useEffect, useCallback } from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";

import GatePassForm from "./GatePassForm";
import GatePassDetails from "./GatePassDetails";

import { list, verify, create } from "./gatePassData";

function GatePasses() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  const fetchPasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await list({ search, status: statusFilter, page });
      setPasses(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to load gate passes.");
      setPasses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const filteredPasses = passes; // We fetch filtered passes directly from backend

  const handleSave = async (payload) => {
    try {
      await create(payload);
      setShowForm(false);
      fetchPasses();
    } catch (err) {
      alert("Failed to create gate pass: " + err.message);
    }
  };

  const verifyPass = async (pass) => {
    try {
      await verify(pass.id, { remarks: "Verified by Security Officer." });
      fetchPasses();
      setSelectedPass(null); // Return to list after verifying
    } catch (err) {
      alert("Failed to verify gate pass: " + err.message);
    }
  };

  if (selectedPass) {
    return (
      <GatePassDetails
        pass={selectedPass}
        onBack={() =>
          setSelectedPass(null)
        }
        onEdit={() => {}}
        onVerify={verifyPass}
        onDelete={() => {}}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title="Create Gate Pass"
          description="Create and manage outgoing material gate passes."
        />

        <GatePassForm
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Gate Pass"
        description="Verify outgoing material movements."
        actionLabel="Create Gate Pass"
        onAction={() => {
          setShowForm(true);
        }}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search gate passes..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="All">All</option>
            <option value="CREATED">Created</option>
            <option value="SECURITY_VERIFIED">Security Verified</option>
            <option value="EXIT_CONFIRMED">Exit Confirmed</option>
            <option value="DISPATCH_RECORDED">Dispatch Recorded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message" style={{ color: "red", padding: "16px" }}>{error}</div>}
      
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>Loading gate passes...</div>
      ) : !error ? (
        <div className="data-card">
        {filteredPasses.length === 0 ? (
          <EmptyState
            title="No gate passes found"
            message="Try changing your search or filter."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gate Pass</th>
                  <th>Issue Reference</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPasses.map(
                  (pass) => (
                    <tr key={pass.id}>
                      <td>{pass.gatePassNumber}</td>
                      <td>{pass.issueVoucherNo}</td>
                      <td>{pass.vehicleNumber}</td>
                      <td>{pass.driverName}</td>
                      <td>{pass.destination}</td>

                      <td>
                        <span className="status-badge">
                          {pass.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() =>
                              setSelectedPass(
                                pass
                              )
                            }
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!error && !loading && totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
      ) : null}
    </div>
  );
}

export default GatePasses;