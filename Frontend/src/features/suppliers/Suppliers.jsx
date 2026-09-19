import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource } from "../../api/masterData";
import SupplierForm from "./SupplierForm";
import SupplierDetails from "./SupplierDetails";
import "./Suppliers.css";

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load suppliers
  useEffect(() => {
    let isMounted = true;
    async function loadSuppliers() {
      setLoading(true);
      setError("");

      try {
        const queryParams = {
          search,
          status: statusFilter === "All" ? undefined : statusFilter,
          page: pagination.page,
          limit: pagination.limit
        };

        const { records, pagination: newPagination } = await fetchPaginatedResource("suppliers", queryParams);
        
        if (isMounted) {
          setSuppliers(records || []);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load suppliers.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSuppliers();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter]);

  const handleSave = async (supplierPayload) => {
    try {
      if (editingSupplier) {
        await updateResource("suppliers", editingSupplier.id, supplierPayload);
        window.alert("Supplier updated successfully.");
      } else {
        await createResource("suppliers", supplierPayload);
        window.alert("Supplier created successfully.");
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingSupplier(null);
    } catch (error) {
      if (error.message?.includes("Unique constraint") || error.message?.toLowerCase().includes("unique")) {
        window.alert("Validation Error: Supplier code already exists.");
      } else {
        window.alert(error.message || "Unable to save supplier.");
      }
      throw error;
    }
  };

  const deleteSuppliers = async (supplier) => {
    const confirmed = window.confirm(`Are you sure you want to delete supplier ${supplier.code}?\n\nWarning: If this supplier is used in any transactions (like purchase orders or goods receipts), deletion will be prevented to protect historical records.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("suppliers", supplier.id);
      window.alert("Supplier deleted successfully.");
      setRefreshTrigger(prev => prev + 1);
      setSelectedSupplierId(null);
      setEditingSupplier(null);
      setShowForm(false);
    } catch (error) {
      if (error.message?.includes("foreign") || error.message?.includes("reference") || error.message?.includes("restrict") || error.message?.includes("violate")) {
        window.alert(`Cannot delete this supplier (${supplier.code}) because it is referenced by operational or historical records (like Purchase Orders or Goods Receipts). Please DEACTIVATE the supplier instead by setting its status to Inactive.`);
      } else {
        window.alert(error.message || "Unable to delete supplier.");
      }
    }
  };

  if (selectedSupplierId) {
    return (
      <SupplierDetails
        supplierId={selectedSupplierId}
        onBack={() => setSelectedSupplierId(null)}
        onEdit={(supplier) => {
          setEditingSupplier(supplier);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
          description="Manage material suppliers."
        />
        <SupplierForm
          initialData={editingSupplier}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingSupplier(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Suppliers"
        description="Manage material suppliers."
        actionLabel="Add Supplier"
        onAction={() => {
          setEditingSupplier(null);
          setShowForm(true);
        }}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search suppliers..."
          />

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading suppliers...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {suppliers.length === 0 ? (
            <EmptyState
              title="No suppliers found"
              message="No suppliers match your current search and filters."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Supplier</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td style={{ fontWeight: '500' }}>{supplier.code}</td>
                      <td><span className="primary-text">{supplier.name}</span></td>
                      <td>{supplier.contact || "-"}</td>
                      <td>{supplier.phone || "-"}</td>
                      <td>{supplier.email || "-"}</td>
                      <td>
                        <span className={`status-badge ${supplier.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {supplier.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedSupplierId(supplier.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => deleteSuppliers(supplier)}
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
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'supplier' : 'suppliers'}
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

export default Suppliers;