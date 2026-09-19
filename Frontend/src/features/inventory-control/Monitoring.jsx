import { useMemo, useState, useEffect } from "react";
import { fetchInventoryOverview } from "../../api/inventory";
import "./control.css";

function Monitoring() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monitoringItems, setMonitoringItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchInventoryOverview({ limit: 500 });
        if (mounted) {
          setMonitoringItems(data);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err.message || "Failed to load inventory data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filteredItems = useMemo(() => {
    return monitoringItems.filter((item) => {
      const matchesSearch =
        item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        item.itemCode?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, monitoringItems]);

  const counts = {
    normal: monitoringItems.filter((item) => item.status === "Normal").length,
    low: monitoringItems.filter((item) => item.status === "Low Stock").length,
    reorder: monitoringItems.filter((item) => item.status === "Reorder").length,
    overstock: monitoringItems.filter((item) => item.status === "Overstock").length,
    damaged: monitoringItems.filter((item) => item.status === "Damaged").length,
    obsolete: monitoringItems.filter((item) => item.status === "Obsolete").length,
  };

  return (
    <div className="control-page">

      <div className="page-header">
        <div>
          <h1>Stock Monitoring</h1>
          <p>
            Monitor inventory levels, reorder conditions,
            damaged and obsolete materials.
          </p>
        </div>
      </div>

      <div className="monitor-summary">

        <div className="monitor-card">
          <span>Normal</span>
          <strong>{counts.normal}</strong>
        </div>

        <div className="monitor-card warning">
          <span>Low Stock</span>
          <strong>{counts.low}</strong>
        </div>

        <div className="monitor-card reorder">
          <span>Reorder</span>
          <strong>{counts.reorder}</strong>
        </div>
        
        <div className="monitor-card">
          <span>Overstock</span>
          <strong>{counts.overstock}</strong>
        </div>

        <div className="monitor-card warning">
          <span>Damaged</span>
          <strong>{counts.damaged}</strong>
        </div>

        <div className="monitor-card danger">
          <span>Obsolete</span>
          <strong>{counts.obsolete}</strong>
        </div>

      </div>

      <div className="control-panel">

        <input
          type="text"
          placeholder="Search item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search by item name or code"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="All">All Status</option>
          <option value="Normal">Normal</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Reorder">Reorder</option>
          <option value="Overstock">Overstock</option>
          <option value="Damaged">Damaged</option>
          <option value="Obsolete">Obsolete</option>
        </select>

      </div>
      <div className="master-result-summary">

        <span>
          Showing{" "}
          <strong>
            {filteredItems.length}
          </strong>{" "}
          of{" "}
          <strong>
            {monitoringItems.length}
          </strong>{" "}
          items
        </span>

      </div>

      <div className="table-card">
        {error ? (
          <div className="form-error" role="alert" style={{ margin: "20px", color: "red", backgroundColor: "#ffe6e6", padding: "15px", borderRadius: "4px" }}>
            {error}
            <button onClick={() => window.location.reload()} style={{ marginLeft: "15px", padding: "5px 10px", cursor: "pointer", borderRadius: "4px", border: "1px solid #ccc" }}>Retry</button>
          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                <th>Store</th>
                <th>Quantity</th>
                <th>Minimum</th>
                <th>Reorder</th>
                <th>Maximum</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px" }}>
                    Loading inventory data...
                  </td>
                </tr>
              ) : monitoringItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px" }}>
                    No inventory records found.
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px" }}>
                    No items match your current search or status filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (

                  <tr key={item.id}>

                    <td>{item.itemCode}</td>

                    <td>
                      <strong>{item.itemName}</strong>
                      <small style={{display: 'block', color: '#666'}}>{item.category}</small>
                    </td>

                    <td>{item.locationLabel}</td>

                    <td>{item.quantity}</td>

                    <td>{item.minimum}</td>

                    <td>{item.reorder}</td>

                    <td>{item.maximum}</td>

                    <td>
                      <span className={`status-badge ${item.status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}>
                        {item.status}
                      </span>
                    </td>

                  </tr>

                ))
              )}
            </tbody>

          </table>
        )}
      </div>

    </div>
  );
}

export default Monitoring;