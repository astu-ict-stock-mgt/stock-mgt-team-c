import { useEffect, useState } from "react";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import { createDelivery, fetchDeliveries, updateDelivery } from "../../../api/procurement";

import DeliveryForm from "./DeliveryForm";
import DeliveryDetails from "./DeliveryDetails";

function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reset page to 1 when search or status filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadDeliveries() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDeliveries({ search, status: statusFilter === "All" ? undefined : statusFilter, page, limit: 20 });
        if (isMounted) {
          setDeliveries(result.data);
          setPagination(result.pagination);
        }
      } catch (err) {
        console.error("Unable to load deliveries.", err);
        if (isMounted) {
          setError(err.message || "Failed to load deliveries.");
          setDeliveries([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDeliveries();
    return () => {
      isMounted = false;
    };
  }, [search, statusFilter, page, refreshCounter]);



  /* =========================
     SAVE DELIVERY
  ========================= */

  const handleSave = async (payload) => {
    try {
      if (editingDelivery) {
        await updateDelivery(editingDelivery.id, payload);
      } else {
        await createDelivery(payload);
      }

      setShowForm(false);
      setEditingDelivery(null);
      setSelectedDelivery(null);

      // Trigger a refresh from the server
      setRefreshCounter(prev => prev + 1);
    } catch (err) {
      console.error("Unable to save delivery.", err);
      window.alert(err.message || "Unable to save delivery.");
    }
  };

  const deleteDelivery = () => {
    window.alert("Delete is not supported by the live delivery API in this workflow.");
  };

  /* =========================
     VIEW DELIVERY
  ========================= */

  if (selectedDelivery) {
    return (
      <DeliveryDetails
        delivery={selectedDelivery}
        onBack={() => setSelectedDelivery(null)}
        onEdit={(delivery) => {
          setSelectedDelivery(null);
          setEditingDelivery({
            ...delivery,
            purchaseOrderId: delivery.purchaseOrderId,
            expectedDate: delivery.expectedDate || delivery.expected,
            actualDate: delivery.actualDate || delivery.actual,
            status: delivery.status,
            notes: delivery.notes,
            items: delivery.items?.map(i => ({
              id: i.id,
              purchaseOrderItemId: i.purchaseOrderItemId,
              quantity: i.quantity,
              itemCode: i.itemCode || "Code",
              itemName: i.item || "Name",
            })) || []
          });
          setShowForm(true);
        }}
      />
    );
  }

  /* =========================
     DELIVERY FORM
  ========================= */

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingDelivery ? "Edit Delivery" : "Add Delivery"}
          description={editingDelivery ? "Update delivery information." : "Register a supplier delivery."}
        />

        <DeliveryForm
          initialData={editingDelivery}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingDelivery(null);
          }}
        />
      </div>
    );
  }

  /* =========================
     MAIN PAGE
  ========================= */

  const availableStatuses = Array.from(new Set(deliveries.map(d => d.status))).sort();

  return (
    <div className="master-page">
      <PageHeader
        title="Delivery Tracking"
        description="Track and manage supplier deliveries."
        actionLabel="Add Delivery"
        onAction={() => {
          setEditingDelivery(null);
          setShowForm(true);
        }}
      />

      {/* SEARCH + FILTER */}
      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search deliveries..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Status</option>
            {availableStatuses.includes("IN_TRANSIT") || <option value="IN_TRANSIT">IN TRANSIT</option>}
            {availableStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="master-result-summary">
        <span>
          Showing <strong>{deliveries.length}</strong> of <strong>{pagination.total}</strong> deliveries
        </span>
      </div>

      <div className="data-card">
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center" }}>Loading deliveries...</div>
        ) : error ? (
          <EmptyState title="Error" message={error} />
        ) : deliveries.length === 0 ? (
          <EmptyState
            title="No deliveries found"
            message="Try changing your search or status filter."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Delivery</th>
                  <th>Purchase Order</th>
                  <th>Supplier</th>
                  <th>Expected</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>
                      <span className="primary-text">{delivery.deliveryNumber || delivery.id}</span>
                    </td>
                    <td>{delivery.po}</td>
                    <td>{delivery.supplier}</td>
                    <td>{delivery.expected ? new Date(delivery.expected).toLocaleDateString() : ""}</td>
                    <td>
                      <span className="status-badge">{delivery.status}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => {
                            setEditingDelivery({
                              id: delivery.id,
                              purchaseOrderId: delivery.purchaseOrderId,
                              expectedDate: delivery.expectedDate || delivery.expected,
                              actualDate: delivery.actualDate || delivery.actual,
                              status: delivery.status,
                              notes: delivery.notes,
                              items: delivery.items?.map(i => ({
                                id: i.id,
                                purchaseOrderItemId: i.purchaseOrderItemId,
                                quantity: i.quantity,
                                itemCode: i.itemCode || "Code",
                                itemName: i.item || "Name",
                              })) || []
                            });
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && pagination.totalPages > 1 && (
          <div className="pagination-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Deliveries;