import { useEffect, useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource, toggleResourceStatus } from "../../api/masterData";

import WarehouseForm from "./WarehouseForm";
import WarehouseDetails from "./WarehouseDetails";

function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadWarehouses() {
      setLoading(true);
      setError("");

      try {
        const { records, pagination: newPagination } = await fetchPaginatedResource("warehouses", {
          search,
          status: statusFilter,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setWarehouses(records);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load warehouses.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWarehouses();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter]);

  const handleSave = async (warehouseData) => {
    try {
      if (editingWarehouse) {
        await updateResource("warehouses", editingWarehouse.id, warehouseData);
      } else {
        await createResource("warehouses", warehouseData);
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingWarehouse(null);
    } catch (error) {
      window.alert(error.message || "Unable to save warehouse.");
      throw error;
    }
  };

  const handleToggleStatus = async (warehouse) => {
    try {
      const newStatus = warehouse.status === "Active" ? "Inactive" : "Active";
      await toggleResourceStatus("warehouses", warehouse.id, newStatus);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      window.alert(error.message || "Failed to change warehouse status.");
      throw error;
    }
  };

  const handleDelete = async (warehouse) => {
    const confirmed = window.confirm(`Are you sure you want to delete warehouse ${warehouse.code}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("warehouses", warehouse.id);
      setRefreshTrigger(prev => prev + 1);
      setSelectedWarehouseId(null);
      setEditingWarehouse(null);
      setShowForm(false);
    } catch (err) {
      if (err.message?.includes("foreign") || err.message?.includes("reference") || err.message?.includes("Shelf")) {
        window.alert(`Cannot delete this warehouse (${warehouse.code}) because it is in use by dependent records (like Shelves).`);
      } else {
        window.alert(err.message || "Unable to delete warehouse.");
      }
    }
  };

  if (selectedWarehouseId) {
    return (
      <WarehouseDetails
        warehouseId={selectedWarehouseId}
        onBack={() => setSelectedWarehouseId(null)}
        onEdit={(warehouse) => {
          setEditingWarehouse(warehouse);
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
          title={editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
          description="Manage warehouse information and storage locations."
        />

        <WarehouseForm
          initialData={editingWarehouse}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingWarehouse(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Warehouses"
        description="Manage warehouses and major inventory storage locations."
        actionLabel="Add Warehouse"
        onAction={() => setShowForm(true)}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search warehouses..." />

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading warehouses...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {warehouses.length === 0 ? (
            <EmptyState
              title="No warehouses found"
              message="No warehouses match your current search and filter."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); } }}
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
                  {warehouses.map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td style={{ fontWeight: '500' }}>{warehouse.code}</td>
                      <td>{warehouse.name}</td>
                      <td>{warehouse.type}</td>
                      <td>{warehouse.departmentRef?.name || "-"}</td>
                      <td>
                        <span className={`status-badge ${warehouse.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {warehouse.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedWarehouseId(warehouse.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingWarehouse(warehouse);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => handleDelete(warehouse)}
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
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'warehouse' : 'warehouses'}
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

export default Warehouses;