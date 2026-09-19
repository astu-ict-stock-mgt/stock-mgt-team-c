import { useMemo, useState, useEffect } from "react";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";

import StockAdjustmentForm from "./StockAdjustmentForm";
import StockAdjustmentDetails from "./StockAdjustmentDetails";

import { listAdjustments } from "./stockAdjustmentData";

function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    if (status === 'Pending Authorization') return 'pending';
    return '';
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdjustments();
      setAdjustments(data);
    } catch (err) {
      setError(err.message || "Failed to load stock adjustments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const filteredAdjustments = useMemo(() => {
    const value = search.trim().toLowerCase();

    return adjustments.filter((adjustment) => {
      const matchesSearch =
        !value ||
        (adjustment.number || "").toLowerCase().includes(value) ||
        (adjustment.item || "").toLowerCase().includes(value) ||
        (adjustment.reason || "").toLowerCase().includes(value) ||
        (adjustment.requestedBy || "").toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "All" || adjustment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [adjustments, search, statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const totalAdjustments = adjustments.length;

  const pendingAdjustments = adjustments.filter(
    (adjustment) => adjustment.status === "Pending Authorization"
  ).length;

  const approvedAdjustments = adjustments.filter(
    (adjustment) => adjustment.status === "Approved"
  ).length;

  const rejectedAdjustments = adjustments.filter(
    (adjustment) => adjustment.status === "Rejected"
  ).length;

  if (selectedAdjustment) {
    return (
      <StockAdjustmentDetails
        adjustment={selectedAdjustment}
        onBack={() => setSelectedAdjustment(null)}
        onRefresh={() => {
          setSelectedAdjustment(null);
          fetchAdjustments();
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="page-container">
        <PageHeader
          title="Submit Stock Adjustment"
          description="Submit an inventory adjustment for authorization."
        />
        <StockAdjustmentForm
          onSubmitSuccess={() => {
            setShowForm(false);
            fetchAdjustments();
          }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Stock Adjustment"
        description="Submit and monitor inventory adjustments requiring authorization."
        actionLabel="New Adjustment"
        onAction={() => setShowForm(true)}
      />

      {/* Summary */}
      <div
        className="summary-grid"
        style={{
          marginBottom: "20px",
        }}
      >
        <div className="summary-card">
          <span className="summary-label">Total Adjustments</span>
          <strong className="summary-value">{totalAdjustments}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Pending Authorization</span>
          <strong className="summary-value">{pendingAdjustments}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approved</span>
          <strong className="summary-value">{approvedAdjustments}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Rejected</span>
          <strong className="summary-value">{rejectedAdjustments}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search adjustments..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending Authorization">Pending Authorization</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            type="button"
            className="secondary-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ color: "red", padding: "16px" }}>
          {error}
        </div>
      )}

      {/* Adjustment Table */}
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>Loading stock adjustments...</div>
      ) : (
        <div className="data-card">
          {filteredAdjustments.length === 0 ? (
            <EmptyState
              title="No adjustments found"
              message="Try changing your search or status filter."
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Adjustment</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Direction</th>
                    <th>Date</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjustments.map((adjustment) => (
                    <tr key={adjustment.id}>
                      <td>{adjustment.number}</td>
                      <td>{adjustment.item}</td>
                      <td>{adjustment.quantity}</td>
                      <td>{adjustment.direction}</td>
                      <td>{adjustment.date}</td>
                      <td>{adjustment.requestedBy}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(adjustment.status)}`}>{adjustment.status}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedAdjustment(adjustment)}
                          >
                            View
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

export default StockAdjustments;