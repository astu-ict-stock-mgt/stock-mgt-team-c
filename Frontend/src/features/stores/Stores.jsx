import { useEffect, useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource, toggleResourceStatus } from "../../api/masterData";

import StoreForm from "./StoreForm";
import StoreDetails from "./StoreDetails";

import "./Stores.css";

function Stores() {
  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadStores() {
      setLoading(true);
      setError("");

      try {
        const { records, pagination: newPagination } = await fetchPaginatedResource("stores", {
          search,
          status: statusFilter,
          type: typeFilter !== "All" ? typeFilter : undefined,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setStores(records);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load stores.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStores();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, typeFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter, typeFilter]);

  const handleSave = async (storeData) => {
    try {
      if (editingStore) {
        await updateResource("stores", editingStore.id, storeData);
      } else {
        await createResource("stores", storeData);
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
        setTypeFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingStore(null);
    } catch (error) {
      window.alert(error.message || "Unable to save store.");
      throw error;
    }
  };

  const handleToggleStatus = async (store) => {
    try {
      const newStatus = store.status === "Active" ? "Inactive" : "Active";
      await toggleResourceStatus("stores", store.id, newStatus);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      window.alert(error.message || "Failed to change store status.");
      throw error;
    }
  };

  const handleDelete = async (store) => {
    const confirmed = window.confirm(`Are you sure you want to delete store ${store.code}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("stores", store.id);
      setRefreshTrigger(prev => prev + 1);
      setSelectedStoreId(null);
      setEditingStore(null);
      setShowForm(false);
    } catch (err) {
      if (err.message?.includes("foreign") || err.message?.includes("reference") || err.message?.includes("Item") || err.message?.includes("Location") || err.message?.includes("GoodsReceipt")) {
        window.alert(`Cannot delete this store (${store.code}) because it is in use by dependent records (like Items or Locations).`);
      } else {
        window.alert(err.message || "Unable to delete store.");
      }
    }
  };

  if (selectedStoreId) {
    return (
      <StoreDetails
        storeId={selectedStoreId}
        onBack={() => setSelectedStoreId(null)}
        onEdit={(store) => {
          setEditingStore(store);
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
          title={editingStore ? "Edit Store" : "New Store"}
          description={editingStore ? "Update store details" : "Create a new operational store"}
        />

        <StoreForm
          initialData={editingStore}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingStore(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Stores"
        description="Manage organizational stores and warehouses"
        actionLabel="Add Store"
        onAction={() => setShowForm(true)}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search stores..." />

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Main">Main</option>
            <option value="Department">Department</option>
            <option value="Cafe">Cafe</option>
          </select>

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading stores...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {stores.length === 0 ? (
            <EmptyState
              title="No stores found"
              message="No stores match your current search and filter."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); setTypeFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id}>
                      <td style={{ fontWeight: '500' }}>{store.code}</td>
                      <td>{store.name}</td>
                      <td>{store.type}</td>
                      <td>{store.departmentRef?.name || "-"}</td>
                      <td>
                        <span className={`status-badge ${store.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {store.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedStoreId(store.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingStore(store);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => handleDelete(store)}
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

export default Stores;