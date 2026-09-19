import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getResourceById } from "../../api/masterData";

function CategoryDetails({
  categoryId,
  onBack,
  onEdit,
}) {
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadCategory() {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById("categories", categoryId);
        if (isMounted) {
          if (!data) setError("Category not found.");
          else setCategory(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load category details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (categoryId) loadCategory();
    return () => { isMounted = false; };
  }, [categoryId]);

  if (loading) {
    return (
      <div className="master-page">
        <PageHeader title="Category Details" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading category details...</div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="master-page">
        <PageHeader title="Category Details" />
        <div className="form-error" style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          {error || "Category not found."}
        </div>
        <button className="secondary-button" onClick={onBack}>Back to Categories</button>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back to Categories
        </button>

        {onEdit && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onEdit(category)}
          >
            Edit Category
          </button>
        )}
      </div>

      <div className="details-card">
        <div className="page-header">
          <div>
            <h1>{category.name}</h1>
            <p>{category.code}</p>
          </div>
          <span className={`status-badge ${category.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'}`}>
            {category.status || "Active"}
          </span>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Category Code</span>
            <span className="detail-value">{category.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Category Name</span>
            <span className="detail-value">{category.name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Store Type</span>
            <span className="detail-value">{category.storeType || "-"}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">{category.status || "Active"}</span>
          </div>

          <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
            <span className="detail-label">Description</span>
            <span className="detail-value">{category.description || "No description provided."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryDetails;