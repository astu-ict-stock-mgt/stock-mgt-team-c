import { useEffect, useMemo, useState, useContext } from "react";
import AuthContext from "../../../context/AuthContext";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import { createPurchaseOrder, fetchPurchaseOrders, updatePurchaseOrder } from "../../../api/procurement";

import PurchaseOrderForm from "./PurchaseOrderForm";
import PurchaseOrderDetails from "./PurchaseOrderDetails";

function PurchaseOrders() {
  const { hasPermission } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        const records = await fetchPurchaseOrders({ search, status: statusFilter === "All" ? undefined : statusFilter, limit: 100 });
        if (isMounted) {
          setOrders(records);
        }
      } catch (error) {
        console.error("Unable to load purchase orders.", error);
        if (isMounted) {
          setError(error.message || "Failed to load purchase orders.");
          setOrders([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();
    return () => {
      isMounted = false;
    };
  }, [search, statusFilter]);

  const filteredOrders = useMemo(() => {
    const value = search.toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !value ||
        order.number.toLowerCase().includes(value) ||
        order.supplier.toLowerCase().includes(value) ||
        order.requisition.toLowerCase().includes(value);

      const matchesStatus = statusFilter === "All" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const handleSave = async (payload) => {
    try {
      const saved = editingOrder
        ? await updatePurchaseOrder(editingOrder.id, payload)
        : await createPurchaseOrder(payload);

      setOrders((previous) => {
        const normalized = {
          ...saved,
          number: saved.orderNumber || saved.number || "N/A",
          supplier: saved.supplier?.name || saved.supplier || "Unknown supplier",
          requisition: saved.requisition?.requestNumber || saved.requisitionId || "N/A",
          date: saved.orderDate || saved.date || "",
          amount: saved.totalAmount || saved.amount || 0,
        };

        if (editingOrder) {
          return previous.map((current) => (current.id === editingOrder.id ? { ...current, ...normalized } : current));
        }

        return [normalized, ...previous];
      });

      setShowForm(false);
      setEditingOrder(null);
    } catch (error) {
      console.error("Unable to save purchase order.", error);
      window.alert(error.message || "Unable to save purchase order.");
    }
  };

  const deleteOrder = () => {
    // delete is intentionally unsupported by the procurement API contract in this phase
    window.alert("Delete is not supported by the live purchase-order API for this workflow.");
  };

  if (selectedOrder) {
    return (
      <PurchaseOrderDetails
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onEdit={(order) => {
          setSelectedOrder(null);
          setEditingOrder({
            ...order,
            // Prepare initial data matching the form schema
            supplierId: order.supplierId,
            requisitionId: order.requisitionId,
            expectedDeliveryDate: order.expectedDeliveryDate,
            notes: order.notes,
            items: order.items?.map(i => ({
              id: i.id,
              requisitionItemId: i.requisitionItemId,
              itemId: i.itemId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              itemCode: i.itemCode || "Code",
              itemName: i.item || "Name",
              maxQuantity: Number(i.requisitionItem?.quantity || i.quantity),
            })) || []
          });
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title={editingOrder ? "Edit Purchase Order" : "Create Purchase Order"}
          description="Create and manage approved supplier purchase orders."
        />
        <PurchaseOrderForm
          initialData={editingOrder}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingOrder(null);
          }}
        />
      </div>
    );
  }

  // Calculate distinct statuses actually present
  const availableStatuses = Array.from(new Set(orders.map(o => o.status))).sort();

  const canCreate = hasPermission("manage_suppliers") && hasPermission("view_requisitions");

  return (
    <div className="master-page">
      <PageHeader
        title="Purchase Orders"
        description="Manage approved supplier orders."
        actionLabel={canCreate ? "Create Purchase Order" : undefined}
        onAction={canCreate ? () => {
          setEditingOrder(null);
          setShowForm(true);
        } : undefined}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search purchase orders..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Status</option>
            {availableStatuses.includes("ORDERED") || <option value="ORDERED">ORDERED</option>}
            {availableStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="master-result-summary">
        <span>
          Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
        </span>
      </div>

      <div className="data-card">
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center" }}>Loading orders...</div>
        ) : error ? (
          <EmptyState title="Error" message={error} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No purchase orders found"
            message="Try changing your search or filter."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Requisition</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.number}</td>
                    <td>{order.supplier}</td>
                    <td>{order.requisition}</td>
                    <td>{new Date(order.date).toLocaleDateString()}</td>
                    <td>{Number(order.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <span className="status-badge">{order.status}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button type="button" className="table-action" onClick={() => setSelectedOrder(order)}>
                          View
                        </button>
                        {order.status === "ORDERED" && (
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => {
                              setEditingOrder({
                                id: order.id,
                                supplierId: order.supplierId,
                                requisitionId: order.requisitionId,
                                expectedDeliveryDate: order.expectedDeliveryDate,
                                notes: order.notes,
                                items: order.items?.map(i => ({
                                  id: i.id,
                                  requisitionItemId: i.requisitionItemId,
                                  itemId: i.itemId,
                                  quantity: i.quantity,
                                  unitPrice: i.unitPrice,
                                  itemCode: i.itemCode || "Code",
                                  itemName: i.item || "Name",
                                  maxQuantity: Number(i.requisitionItem?.quantity || i.quantity),
                                })) || []
                              });
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseOrders;