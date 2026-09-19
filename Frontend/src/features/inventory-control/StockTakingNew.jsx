import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createStockTaking } from "../../api/stockTaking";
import { fetchResource } from "../../api/masterData";
import "./control.css";

function StockTakingNew() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    storeId: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadStores() {
      try {
        setStoresLoading(true);
        setStoresError("");
        const data = await fetchResource("stores", { limit: 100 });
        if (mounted) setStores(data);
      } catch (err) {
        console.error("Failed to load stores:", err);
        if (mounted) setStoresError("Failed to load stores for selection.");
      } finally {
        if (mounted) setStoresLoading(false);
      }
    }
    loadStores();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.storeId) {
      setError("Store ID is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await createStockTaking({ storeId: form.storeId, remarks: form.remarks });
      navigate("/stock-taking");
    } catch (err) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-page">

      <div className="page-header">

        <div>
          <h1>New Stock Taking Session</h1>
          <p>
            Create a physical inventory counting session.
          </p>
        </div>

      </div>

      <form
        className="form-card"
        onSubmit={handleSubmit}
      >

        {error && (
          <div className="form-error" role="alert" style={{ marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <div className="form-grid">

          <div className="form-group">

            <label>Store ID</label>

            {storesLoading ? (
              <p>Loading stores...</p>
            ) : storesError ? (
              <p className="error-text" style={{ color: "red" }}>{storesError}</p>
            ) : (
              <select
                name="storeId"
                value={form.storeId}
                onChange={handleChange}
                required
                className="select-input"
              >
                <option value="" disabled>Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name} ({store.code})</option>
                ))}
              </select>
            )}

          </div>

        </div>

        <div className="form-group">

          <label>Remarks</label>

          <textarea
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            placeholder="Enter remarks..."
            rows="5"
          />

        </div>

        <div className="form-actions">

          <button
            type="button"
            className="danger-button"
            onClick={() =>
              navigate("/stock-taking")
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={loading || storesLoading || !!storesError}
          >
            {loading ? "Creating..." : "Create Session"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default StockTakingNew;