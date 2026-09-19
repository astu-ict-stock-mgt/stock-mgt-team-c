import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource } from "../../api/masterData";
import ItemForm from "./ItemForm";
import ItemDetails from "./ItemDetails";
import "./Items.css";

function Items() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load dropdowns for filters
  useEffect(() => {
    let isMounted = true;
    async function loadFilters() {
      try {
        const [cats, strs] = await Promise.all([
          fetchPaginatedResource("categories", { limit: 100, status: "Active" }),
          fetchPaginatedResource("stores", { limit: 100, status: "Active" })
        ]);
        if (isMounted) {
          setCategories(cats.records || []);
          setStores(strs.records || []);
        }
      } catch (err) {
        console.error("Failed to load filter dropdowns", err);
      }
    }
    loadFilters();
    return () => { isMounted = false; };
  }, []);

  // Load items
  useEffect(() => {
    let isMounted = true;
    async function loadItems() {
      setLoading(true);
      setError("");

      try {
        const queryParams = {
          search,
          status: statusFilter === "All" ? undefined : statusFilter,
          categoryId: categoryFilter === "All" ? undefined : categoryFilter,
          storeId: storeFilter === "All" ? undefined : storeFilter,
          page: pagination.page,
          limit: pagination.limit
        };

        const { records, pagination: newPagination } = await fetchPaginatedResource("items", queryParams);
        
        if (isMounted) {
          setItems(records || []);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load items.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadItems();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, categoryFilter, storeFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter, categoryFilter, storeFilter]);

  const handleSave = async (itemPayload) => {
    try {
      if (editingItem) {
        await updateResource("items", editingItem.id, itemPayload);
        window.alert("Item updated successfully.");
      } else {
        await createResource("items", itemPayload);
        window.alert("Item created successfully.");
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setCategoryFilter("All");
        setStoreFilter("All");
        setStatusFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      if (error.message?.includes("Unique constraint")) {
        window.alert("Validation Error: Item code must be unique.");
      } else {
        window.alert(error.message || "Unable to save item.");
      }
      throw error;
    }
  };

  const deleteItems = async (item) => {
    const confirmed = window.confirm(`Are you sure you want to delete item ${item.code}?\n\nWarning: If this item is used in any transactions (like requisitions or stock counts), deletion will be prevented to protect historical records.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("items", item.id);
      window.alert("Item deleted successfully.");
      setRefreshTrigger(prev => prev + 1);
      setSelectedItemId(null);
      setEditingItem(null);
      setShowForm(false);
    } catch (error) {
      if (error.message?.includes("foreign") || error.message?.includes("reference") || error.message?.includes("restrict") || error.message?.includes("violate")) {
        window.alert(`Cannot delete this item (${item.code}) because it is referenced by operational records (like stock balances or purchase orders). Please DEACTIVATE the item instead by setting its status to Inactive.`);
      } else {
        window.alert(error.message || "Unable to delete item.");
      }
    }
  };

  if (selectedItemId) {
    return (
      <ItemDetails
        itemId={selectedItemId}
        onBack={() => setSelectedItemId(null)}
        onEdit={(item) => {
          setEditingItem(item);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingItem ? "Edit Item" : "Add Inventory Item"}
          description="Manage material and inventory item information."
        />
        <ItemForm
          initialData={editingItem}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Items"
        description="Manage materials and inventory item information."
        actionLabel="Add Item"
        onAction={() => {
          setEditingItem(null);
          setShowForm(true);
        }}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search items..."
          />

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
          >
            <option value="All">All Stores</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading items...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {items.length === 0 ? (
            <EmptyState
              title="No items found"
              message="No items match your current search and filters."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); setCategoryFilter("All"); setStoreFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Store</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '500' }}>{item.code}</td>
                      <td><span className="primary-text">{item.name}</span></td>
                      <td>{item.category || "-"}</td>
                      <td>{item.store || "-"}</td>
                      <td>
                        <span className={`status-badge ${item.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {item.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedItemId(item.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingItem(item);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => deleteItems(item)}
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
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'item' : 'items'}
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

export default Items;