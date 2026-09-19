import { useEffect, useState } from "react";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource } from "../../../api/masterData";

import UnitForm from "./UnitForm";
import UnitDetails from "./UnitDetails";

function Units() {
  const [units, setUnits] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUnits() {
      setLoading(true);
      setError("");

      try {
        const { records, pagination: newPagination } = await fetchPaginatedResource("units", {
          search,
          status: statusFilter,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setUnits(records);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load units.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUnits();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter]);

  const handleSave = async (unit) => {
    try {
      if (editingUnit) {
        const saved = await updateResource("units", editingUnit.id, unit);
        setUnits((previous) => previous.map((current) => current.id === editingUnit.id ? saved : current));
      } else {
        await createResource("units", unit);
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingUnit(null);
    } catch (err) {
      window.alert(err.message || "Unable to save unit.");
      throw err; // Re-throw to handle submitting state in form
    }
  };

  const handleDelete = async (unit) => {
    const confirmed = window.confirm(`Are you sure you want to delete unit ${unit.code}?`);
    if (!confirmed) return;

    try {
      await deleteResource("units", unit.id);
      setUnits((previous) => previous.filter((current) => current.id !== unit.id));
      setSelectedUnit(null);
      setEditingUnit(null);
      setShowForm(false);
    } catch (err) {
      if (err.message?.includes("foreign") || err.message?.includes("reference") || err.message?.includes("Item")) {
        window.alert(`Cannot delete this unit (${unit.code}) because it is currently assigned to one or more items.`);
      } else {
        window.alert(err.message || "Unable to delete unit.");
      }
    }
  };

  if (selectedUnit) {
    return (
      <UnitDetails
        unitId={selectedUnit.id}
        onBack={() => setSelectedUnit(null)}
        onEdit={(unitData) => {
          setEditingUnit(unitData);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingUnit ? "Edit Unit" : "New Unit"}
          description={editingUnit ? "Update unit of measure details" : "Create a new unit of measure"}
        />

        <UnitForm
          initialData={editingUnit}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingUnit(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Units of Measure"
        description="Manage measurement units for inventory items"
        actionLabel="Add Unit"
        onAction={() => setShowForm(true)}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search units..." />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="form-error" style={{ color: 'red', marginTop: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          <strong>Error: </strong>{error}
          <div style={{ marginTop: '0.5rem' }}>
            <button className="secondary-button small" onClick={() => setPagination(prev => ({...prev}))}>Retry</button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading units...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {units.length === 0 ? (
            <EmptyState
              title="No units found"
              message="No units match your current search and filter."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id}>
                      <td style={{ fontWeight: '500' }}>{unit.code}</td>
                      <td>{unit.name}</td>
                      <td>
                        <span className={`status-badge ${unit.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {unit.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedUnit(unit)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingUnit(unit);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => handleDelete(unit)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #eee' }}>
                  <div>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="secondary-button small" 
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '0.25rem 0.5rem' }}>Page {pagination.page} of {pagination.totalPages}</span>
                    <button 
                      className="secondary-button small" 
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Units;