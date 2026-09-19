import { useEffect, useState } from "react";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource } from "../../../api/masterData";

import DepartmentForm from "./DepartmentForm";
import DepartmentDetails from "./DepartmentDetails";

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDepartments() {
      setLoading(true);
      setError("");
      
      try {
        const { records, pagination: newPagination } = await fetchPaginatedResource("departments", { 
          search, 
          status: statusFilter, 
          page: pagination.page, 
          limit: pagination.limit 
        });
        
        if (isMounted) {
          setDepartments(records);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load departments.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDepartments();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter]);

  const handleSave = async (department) => {
    try {
      if (editingDepartment) {
        const saved = await updateResource("departments", editingDepartment.id, department);
        setDepartments((previous) => previous.map((current) => current.id === editingDepartment.id ? saved : current));
      } else {
        await createResource("departments", department);
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStatusFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingDepartment(null);
    } catch (err) {
      window.alert(err.message || "Unable to save department.");
      throw err; // Re-throw for the form to handle submitting state
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(`Are you sure you want to delete department ${department.name}?`);
    if (!confirmed) return;

    try {
      await deleteResource("departments", department.id);
      setDepartments((previous) => previous.filter((current) => current.id !== department.id));
      setSelectedDepartment(null);
      setEditingDepartment(null);
      setShowForm(false);
    } catch (err) {
      if (err.message?.includes("foreign") || err.message?.includes("reference")) {
        window.alert("Cannot delete this department because it is in use by other records.");
      } else {
        window.alert(err.message || "Unable to delete department.");
      }
    }
  };

  if (selectedDepartment) {
    return (
      <DepartmentDetails
        departmentId={selectedDepartment.id}
        onBack={() => setSelectedDepartment(null)}
        onEdit={(dept) => {
          setEditingDepartment(dept);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingDepartment ? "Edit Department" : "New Department"}
          description={editingDepartment ? "Update department details" : "Create a new department"}
        />

        <DepartmentForm
          initialData={editingDepartment}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingDepartment(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Departments"
        description="Manage organizational departments"
        actionLabel="Add Department"
        onAction={() => setShowForm(true)}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search departments..." />

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading departments...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {departments.length === 0 ? (
            <EmptyState
              title="No departments found"
              message="No departments match your current search and filter."
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
                  {departments.map((department) => (
                    <tr key={department.id}>
                      <td style={{ fontWeight: '500' }}>{department.code}</td>
                      <td>{department.name}</td>
                      <td>
                        <span className={`status-badge ${department.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {department.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedDepartment(department)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingDepartment(department);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => handleDelete(department)}
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

export default Departments;