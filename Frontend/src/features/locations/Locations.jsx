import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import { createResource, deleteResource, fetchPaginatedResource, updateResource } from "../../api/masterData";
import LocationForm from "./LocationForm";
import LocationDetails from "./LocationDetails";
import "./Locations.css";

function Locations() {
  const [locations, setLocations] = useState([]);
  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Store filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadStores() {
      try {
        const { records } = await fetchPaginatedResource("stores", { limit: 100, status: "Active" });
        if (isMounted) setStores(records || []);
      } catch (err) {
        console.error("Failed to load stores for filter dropdown", err);
      }
    }
    loadStores();
    return () => { isMounted = false; };
  }, []);

  // Load locations
  useEffect(() => {
    let isMounted = true;
    // Debounce search slightly
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const queryParams = {
          search,
          storeId: storeFilter === "All" ? undefined : storeFilter,
          page: pagination.page,
          limit: pagination.limit
        };

        const { records, pagination: newPagination } = await fetchPaginatedResource("locations", queryParams);
        
        if (isMounted) {
          setLocations(records || []);
          setPagination(newPagination);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Unable to load locations.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 300);

    return () => { 
      isMounted = false; 
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, storeFilter, pagination.page, pagination.limit, refreshTrigger]);

  // Reset page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, storeFilter]);

  const handleSave = async (locationPayload) => {
    try {
      if (editingLocation) {
        await updateResource("locations", editingLocation.id, locationPayload);
        window.alert("Location updated successfully.");
      } else {
        await createResource("locations", locationPayload);
        window.alert("Location created successfully.");
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch("");
        setStoreFilter("All");
      }

      setRefreshTrigger(prev => prev + 1);
      setShowForm(false);
      setEditingLocation(null);
    } catch (error) {
      if (error.message?.includes("Unique constraint") || error.message?.toLowerCase().includes("unique")) {
        window.alert("Validation Error: Location code already exists.");
      } else {
        window.alert(error.message || "Unable to save location.");
      }
      throw error;
    }
  };

  const deleteLocations = async (location) => {
    const confirmed = window.confirm(`Are you sure you want to delete location ${location.code}?\n\nWarning: If this location is used in any transactions (like stock counts or balances), deletion will be prevented to protect records.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteResource("locations", location.id);
      window.alert("Location deleted successfully.");
      setRefreshTrigger(prev => prev + 1);
      setSelectedLocationId(null);
      setEditingLocation(null);
      setShowForm(false);
    } catch (error) {
      if (error.message?.includes("foreign") || error.message?.includes("reference") || error.message?.includes("restrict") || error.message?.includes("violate")) {
        window.alert(`Cannot delete this location (${location.code}) because it is referenced by operational records (like stock items). Please DEACTIVATE the location instead by setting its status to Inactive.`);
      } else {
        window.alert(error.message || "Unable to delete location.");
      }
    }
  };

  if (selectedLocationId) {
    return (
      <LocationDetails
        locationId={selectedLocationId}
        onBack={() => setSelectedLocationId(null)}
        onEdit={(location) => {
          setEditingLocation(location);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingLocation ? "Edit Location" : "Add Location"}
          description={editingLocation ? "Update physical storage location information." : "Create a new physical material storage location."}
        />
        <LocationForm
          initialData={editingLocation}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingLocation(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Item Locations"
        description="Manage physical material storage locations."
        actionLabel="Add Location"
        onAction={() => {
          setEditingLocation(null);
          setShowForm(true);
        }}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search locations..."
          />

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading locations...</div>
      ) : (
        <div className="data-card" style={{ marginTop: '1rem' }}>
          {locations.length === 0 ? (
            <EmptyState
              title="No locations found"
              message="No locations match your current search and filters."
              action={{ label: "Clear Filters", onClick: () => { setSearch(""); setStoreFilter("All"); } }}
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Store</th>
                    <th>Section</th>
                    <th>Shelf</th>
                    <th>Bin</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td style={{ fontWeight: '500' }}>{location.code}</td>
                      <td>{location.store || "-"}</td>
                      <td>{location.section || "-"}</td>
                      <td>{location.shelf || "-"}</td>
                      <td>{location.bin || "-"}</td>
                      <td>
                        <span className={`status-badge ${location.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
                          {location.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => setSelectedLocationId(location.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingLocation(location);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action danger"
                            onClick={() => deleteLocations(location)}
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
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'location' : 'locations'}
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

export default Locations;