import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import "./assets.css";

function AssetDetails() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const resp = await apiRequest(`/assets/${id}`);
        const data = resp?.data?.asset || resp?.data || null;
        if (!mounted) return;
        setAsset(data);
      } catch (err) {
        console.error("Failed to load asset:", err);
        setAsset(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return <div className="module-page"><div className="empty-state">Loading asset...</div></div>;
  }

  if (!asset) {
    return <div className="module-page"><div className="empty-state">Asset not found.</div></div>;
  }

  return (
    <div className="module-page">

      <div className="page-header">

        <div>

          <Link to="/assets" className="back-link">
            ← Fixed Assets
          </Link>

          <h1>{asset.item?.name || asset.assetNumber}</h1>

          <p>{asset.id} · {asset.assetNumber}</p>

        </div>

        <span className="asset-status">
          {asset.status}
        </span>

      </div>

      <div className="asset-detail-grid">

        <div className="form-card">

          <h2>Asset Information</h2>

          <div className="detail-list">

            <div>
              <span>Asset Code</span>
              <strong>{asset.assetNumber}</strong>
            </div>

            <div>
              <span>Item</span>
              <strong>{asset.item?.name}</strong>
            </div>

            <div>
              <span>Serial Number</span>
              <strong>{asset.serialNumber}</strong>
            </div>

            <div>
              <span>Acquisition Date</span>
              <strong>{asset.acquisitionDate ? asset.acquisitionDate.split("T")[0] : ""}</strong>
            </div>

            <div>
              <span>Value</span>
              <strong>{asset.acquisitionValue ?? ""}</strong>
            </div>

          </div>

        </div>

        <div className="form-card">

          <h2>Assignment</h2>

          <div className="detail-list">

            <div>
              <span>Location</span>
              <strong>{asset.currentLocation?.name}</strong>
            </div>

            <div>
              <span>Custodian</span>
              <strong>{asset.assignedUser?.fullName || asset.assignedDepartment?.name || 'Unassigned'}</strong>
            </div>

            <div>
              <span>Condition</span>
              <strong>{asset.status}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{asset.status}</strong>
            </div>

          </div>

        </div>

      </div>

      <div className="form-card">

        <h2>Asset History</h2>

        <table>

          <thead>
            <tr>
              <th>Date</th>
              <th>Activity</th>
              <th>Location</th>
              <th>Custodian</th>
            </tr>
          </thead>

          <tbody>
            {asset.assignments?.map((a) => (
              <tr key={a.id}>
                <td>{a.assignedAt?.split("T")[0]}</td>
                <td>Assigned</td>
                <td>{a.department?.name || asset.currentLocation?.name}</td>
                <td>{a.user?.fullName || a.department?.name}</td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default AssetDetails;