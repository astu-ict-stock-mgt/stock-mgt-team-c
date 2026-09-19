import { useEffect, useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource, toggleResourceStatus } from "../../api/masterData";

import ShelfForm from "./ShelfForm";
import ShelfDetails from "./ShelfDetails";

function Shelves() {
  const [shelves, setShelves] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingShelf, setEditingShelf] = useState(null);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadShelves() {
      setLoading(true);
      setError("");

      try {
        const { records, pagination: newPagination } = await fetchPaginatedResource("shelves", {
          search,
          status: statusFilter,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setShelves(records);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load shelves.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadShelves();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter]);

  const handleSave = async (shelf) => {
    try {
      if (editingShelf) {
        await updateResource("shelves", editingShelf.id, shelf);
      } else {
        await createResource("shelves", shelf);
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingShelf(null);
    } catch (error) {
      window.alert(error.message || "Unable to save shelf.");
      throw error;
    }
  };

  const handleToggleStatus = async (shelf) => {
    try {
      const newStatus = shelf.status === "Active" ? "Inactive" : "Active";
      await toggleResourceStatus("shelves", shelf.id, newStatus);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      window.alert(error.message || "Failed to change shelf status.");
      throw error;
    }
  };

  const handleDelete = async (shelf) => {
    const confirmed = window.confirm(`Are you sure you want to delete shelf ${shelf.code}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("shelves", shelf.id);
      setRefreshTrigger(prev => prev + 1);
      setSelectedShelfId(null);
      setEditingShelf(null);
      setShowForm(false);
    } catch (err) {
      if (err.message?.includes("foreign") || err.message?.includes("reference") || err.message?.includes("Location")) {
        window.alert(`Cannot delete this shelf (${shelf.code}) because it is in use by dependent records (like Locations).`);
      } else {
        window.alert(err.message || "Unable to delete shelf.");
      }
    }
  };

  if (selectedShelfId) {
    return (
      <ShelfDetails
        shelfId={selectedShelfId}
        onBack={() => setSelectedShelfId(null)}
        onEdit={(shelf) => {
          setEditingShelf(shelf);
          setShowForm(true);
        }}
        onToggleStatus={handleToggleStatus}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingShelf ? "Edit Shelf" : "Add Shelf"}
          description="Manage shelf locations within warehouses."
        />

        <ShelfForm
          initialData={editingShelf}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingShelf(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Shelves"
        description="Manage shelf locations within warehouses."
        actionLabel="Add Shelf"
        onAction={() => setShowForm(true)}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search shelves..." />

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
            <button className="secondary-button small" onClick={() => setRefreshTrigger(prev => prev + 1)}>Retry</button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading shelves...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {shelves.length === 0 ? (
            <EmptyState
              title="No shelves found"
              message="No shelves match your current search and filter."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Warehouse</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shelves.map((shelf) => (
                    <tr key={shelf.id}>
                      <td style={{ fontWeight: '500' }}>{shelf.code}</td>
                      <td>{shelf.name}</td>
                      <td>{shelf.warehouse || "-"}</td>
                      <td>{shelf.section || "-"}</td>
                      <td>
                        <span className={`status-badge ${shelf.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {shelf.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedShelfId(shelf.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingShelf(shelf);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => handleDelete(shelf)}
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
              {pagination.totalPages >= 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #eee' }}>
                  <div>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'shelf' : 'shelves'}
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

export default Shelves;