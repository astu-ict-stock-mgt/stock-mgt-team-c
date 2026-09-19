import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./assets.css";
import { apiRequest } from "../../api/client";

function Assets() {
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAssets(q = "") {
    try {
      setLoading(true);
      const resp = await apiRequest(`/assets`, { query: { search: q, page: 1, limit: 100 } });
      const records = resp?.data?.assets || resp?.data || [];
      setAssets(records);
    } catch (err) {
      console.error("Failed to load assets:", err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const run = () => loadAssets();
    queueMicrotask(run);
  }, []);

  const filteredAssets = assets.filter(
    (asset) =>
      (asset.assetNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (asset.item?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (asset.serialNumber || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="module-page">
        <div className="page-header">
          <div>
            <h1>Fixed Assets</h1>
            <p>Register and track organizational fixed assets.</p>
          </div>
        </div>
        <p>Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="module-page">

      <div className="page-header">

        <div>
          <h1>Fixed Assets</h1>
          <p>
            Register and track organizational fixed assets.
          </p>
        </div>

        <Link
          to="/assets/new"
          className="primary-button"
        >
          + Register Asset
        </Link>

      </div>

      <div className="asset-summary">

        <div>
          <span>Total Assets</span>
          <strong>{assets.length}</strong>
        </div>

        <div>
          <span>Assigned</span>
          <strong>-</strong>
        </div>

        <div>
          <span>Available</span>
          <strong>-</strong>
        </div>

        <div>
          <span>Under Maintenance</span>
          <strong>-</strong>
        </div>

      </div>

      <div className="asset-toolbar">

        <input
          placeholder="Search asset code, item or serial number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select>
          <option>All Status</option>
          <option>Assigned</option>
          <option>Available</option>
          <option>Maintenance</option>
        </select>

      </div>

      <div className="table-card">

        <table>

          <thead>
            <tr>
              <th>Asset Code</th>
              <th>Item</th>
              <th>Serial Number</th>
              <th>Location</th>
              <th>Custodian</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {filteredAssets.map((asset) => (

              <tr key={asset.id}>

                <td>
                  <strong>{asset.assetNumber}</strong>
                </td>

                <td>{asset.item?.name}</td>

                <td>{asset.serialNumber}</td>

                <td>{asset.currentLocation?.name}</td>

                <td>{asset.assignedUser?.fullName || asset.assignedDepartment?.name || 'Unassigned'}</td>

                <td>{asset.status}</td>

                <td>
                  <span className="asset-status">
                    {asset.status}
                  </span>
                </td>

                <td>

                  <Link
                    to={`/assets/${asset.id}`}
                    className="table-link"
                  >
                    View
                  </Link>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Assets;