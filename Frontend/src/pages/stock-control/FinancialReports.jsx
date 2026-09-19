import { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { fetchResource } from "../../api/masterData";
import { apiFetch } from "../../api/client";

export default function FinancialReports() {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    storeId: "",
    categoryId: "",
  });

  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [storesData, categoriesData] = await Promise.all([
          fetchResource("stores"),
          fetchResource("categories"),
        ]);
        setStores(storesData);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to load master data", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadMasterData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const queryParams = new URLSearchParams();
      if (formData.startDate) queryParams.append("startDate", formData.startDate);
      if (formData.endDate) queryParams.append("endDate", formData.endDate);
      if (formData.storeId) queryParams.append("storeId", formData.storeId);
      if (formData.categoryId) queryParams.append("categoryId", formData.categoryId);

      const response = await apiFetch(`/reports/financial?${queryParams.toString()}`);
      setReport(response?.data || null);
    } catch (err) {
      setError(err.message || "Failed to generate financial report.");
    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (id) => stores.find(s => s.id === id)?.name || "All Stores";
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || "All Categories";

  return (
    <div className="page-container">
      <PageHeader 
        title="Financial Reports" 
        description="Generate accurate financial valuation reports over a specific period."
      />

      <div className="form-card print-hidden" style={{ marginBottom: "24px" }}>
        {error && (
          <div className="error-message" style={{ color: "red", padding: "12px", marginBottom: "16px", background: "#fdf2f2", borderRadius: "4px" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleGenerate}>
          <div className="form-grid">
            <div className="form-group">
              <label>From Date *</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>To Date *</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Store</label>
              <select name="storeId" value={formData.storeId} onChange={handleChange}>
                <option value="">All Stores</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange}>
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <button type="submit" className="primary-button" disabled={loading || loadingData}>
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div style={{ padding: "32px", textAlign: "center" }}>Computing robust FIFO financial boundaries...</div>
      )}

      {report && !loading && (
        <div className="details-card">
          <div className="page-header" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div>
                <h1 style={{ margin: "0 0 8px 0" }}>Financial Inventory Report</h1>
                <p style={{ margin: "0", color: "#666" }}>
                  Period: <strong>{new Date(report.startDate).toLocaleDateString()}</strong> to <strong>{new Date(report.endDate).toLocaleDateString()}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                  Store: {getStoreName(report.storeId)} | Category: {getCategoryName(report.categoryId)}
                </p>
              </div>
              <button type="button" className="secondary-button print-hidden" onClick={() => window.print()}>
                Print Report
              </button>
            </div>
          </div>

          {!report.costDataComplete && (
            <div style={{ background: "#fff3cd", color: "#856404", padding: "12px", marginBottom: "20px", borderRadius: "4px", fontSize: "14px" }}>
              <strong>⚠️ Warning:</strong> Valuation excludes certain items missing unit cost records. Total figures may be incomplete.
            </div>
          )}

          <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            <div className="summary-card" style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <span style={{ display: "block", color: "#6c757d", fontSize: "14px", marginBottom: "8px" }}>Opening Value</span>
              <strong style={{ fontSize: "24px", color: "#212529" }}>
                {Number(report.openingValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="summary-card" style={{ background: "#e8f5e9", padding: "20px", borderRadius: "8px", border: "1px solid #c8e6c9" }}>
              <span style={{ display: "block", color: "#2e7d32", fontSize: "14px", marginBottom: "8px" }}>Receipts (+)</span>
              <strong style={{ fontSize: "24px", color: "#1b5e20" }}>
                {Number(report.receiptsValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="summary-card" style={{ background: "#fff3e0", padding: "20px", borderRadius: "8px", border: "1px solid #ffe0b2" }}>
              <span style={{ display: "block", color: "#ef6c00", fontSize: "14px", marginBottom: "8px" }}>Adjustments (+/-)</span>
              <strong style={{ fontSize: "24px", color: "#e65100" }}>
                {Number(report.adjustmentsValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="summary-card" style={{ background: "#ffebee", padding: "20px", borderRadius: "8px", border: "1px solid #ffcdd2" }}>
              <span style={{ display: "block", color: "#c62828", fontSize: "14px", marginBottom: "8px" }}>Issues (-)</span>
              <strong style={{ fontSize: "24px", color: "#b71c1c" }}>
                {Number(report.issuesValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="summary-card" style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <span style={{ display: "block", color: "#6c757d", fontSize: "14px", marginBottom: "8px" }}>Closing Value</span>
              <strong style={{ fontSize: "24px", color: "#212529" }}>
                {Number(report.closingValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
