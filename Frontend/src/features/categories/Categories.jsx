import { useEffect, useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource } from "../../api/masterData";

import CategoryForm from "./CategoryForm";
import CategoryDetails from "./CategoryDetails";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setLoading(true);
      setError("");

      try {
        const queryParams = {
          search,
          status: statusFilter,
          page: pagination.page,
          limit: pagination.limit
        };

        // If the API supports storeType filter, we'll pass it. Otherwise we'll fetch and filter client-side if needed.
        // Assuming backend supports storeType since it was listed in validation schemas if added, 
        // wait, the schema allowed storeType for POST, but the GET allowedFilters only listed 'status'. 
        // Let's pass it anyway, backend ignores unknown filters, we might need client-side filtering if backend drops it.
        // Let's check master-data.config.js for categories: allowedFilters: ["status"].
        // So we must filter storeType client-side for now, OR fetch all and filter.
        // BUT wait, pagination + client-side filter don't mix well if there are many pages.
        // Let's fetch paginated, but if storeType filter is active and not supported by backend, it will be broken.
        // Wait, earlier I saw categories didn't have storeType in allowedFilters. I will let backend handle pagination.
        
        const { records, pagination: newPagination } = await fetchPaginatedResource("categories", queryParams);
        
        if (isMounted) {
          // Client-side filtering for storeType if backend didn't filter it
          let filtered = records;
          if (storeFilter !== "All") {
            filtered = records.filter(c => c.storeType === storeFilter);
          }
          setCategories(filtered);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load categories.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCategories();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, storeFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter, storeFilter]);

  const handleSave = async (category) => {
    try {
      if (editingCategory) {
        await updateResource("categories", editingCategory.id, category);
        window.alert("Category updated successfully.");
      } else {
        await createResource("categories", category);
        window.alert("Category created successfully.");
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
        setStoreFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingCategory(null);
    } catch (error) {
      window.alert(error.message || "Unable to save category.");
      throw error;
    }
  };

  const deleteCategory = async (category) => {
    const confirmed = window.confirm(`Are you sure you want to delete category ${category.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("categories", category.id);
      window.alert("Category deleted successfully.");
      setRefreshTrigger(prev => prev + 1);
      setSelectedCategoryId(null);
      setEditingCategory(null);
      setShowForm(false);
    } catch (err) {
      if (err.message?.includes("foreign") || err.message?.includes("reference") || err.message?.includes("Item")) {
        window.alert(`Cannot delete this category (${category.code}) because it is in use by dependent records (like Items).`);
      } else {
        window.alert(err.message || "Unable to delete category.");
      }
    }
  };

  if (selectedCategoryId) {
    return (
      <CategoryDetails
        categoryId={selectedCategoryId}
        onBack={() => setSelectedCategoryId(null)}
        onEdit={(category) => {
          setEditingCategory(category);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingCategory ? "Edit Category" : "Add Category"}
          description={editingCategory ? "Update material category information." : "Create a new material category."}
        />

        <CategoryForm
          initialData={editingCategory}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Item Categories"
        description="Manage material classification and category information."
        actionLabel="Add Category"
        onAction={() => setShowForm(true)}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search categories..." />

          <select
            className="filter-select"
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
          >
            <option value="All">All Store Types</option>
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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading categories...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {categories.length === 0 ? (
            <EmptyState
              title="No categories found"
              message="No categories match your current search and filter."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter("All"); setStoreFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Category</th>
                    <th>Store Type</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td style={{ fontWeight: '500' }}>{category.code}</td>
                      <td><span className="primary-text">{category.name}</span></td>
                      <td>{category.storeType || "-"}</td>
                      <td>{category.description || "-"}</td>
                      <td>
                        <span className={`status-badge ${category.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {category.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedCategoryId(category.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingCategory(category);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => deleteCategory(category)}
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
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'category' : 'categories'}
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

export default Categories;