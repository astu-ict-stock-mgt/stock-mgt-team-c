import { useState, useEffect } from "react";
import { fetchProcurementReportFilters } from "../../../api/procurement";

function ProcurementReportForm({
  initialReportType = "Purchase Requisition Report",
  onGenerate,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    reportType: initialReportType,
    from: "",
    to: "",
    departmentId: "ALL",
    supplierId: "ALL",
    status: "ALL",
  });

  const [departments, setDepartments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filterError, setFilterError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        const filters = await fetchProcurementReportFilters();
        if (isMounted) {
          setDepartments(filters.departments || []);
          setSuppliers(filters.suppliers || []);
          setFilterError(null);
        }
      } catch (error) {
        console.error("Failed to load options", error);
        if (isMounted) {
          setFilterError("Failed to load report filter options. Please try again.");
        }
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      reportType: formData.reportType,
      from: new Date(formData.from).toISOString(),
      to: new Date(formData.to).toISOString(),
    };

    if (formData.departmentId && formData.departmentId !== "ALL") {
      payload.departmentId = formData.departmentId;
    }

    if (formData.supplierId && formData.supplierId !== "ALL") {
      payload.supplierId = formData.supplierId;
    }

    if (formData.status && formData.status !== "ALL") {
      payload.status = formData.status;
    }

    onGenerate(payload);
  };

  return (
    <div className="form-card">
      {filterError && (
        <div style={{ color: "red", padding: "12px", border: "1px solid red", borderRadius: "8px", background: "#fef2f2", marginBottom: "20px" }}>
          <strong>Error:</strong> {filterError}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Report Type *</label>
            <select
              name="reportType"
              value={formData.reportType}
              onChange={handleChange}
              required
            >
              <option value="Purchase Requisition Report">Purchase Requisition Report</option>
              <option value="Purchase Order Report">Purchase Order Report</option>
              <option value="Delivery Report">Delivery Report</option>
            </select>
          </div>

          <div className="form-group">
            <label>From *</label>
            <input
              type="date"
              name="from"
              value={formData.from}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>To *</label>
            <input
              type="date"
              name="to"
              value={formData.to}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              disabled={formData.reportType === "Delivery Report"}
            >
              <option value="ALL">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Supplier</label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              disabled={formData.reportType === "Purchase Requisition Report"}
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map(supp => (
                <option key={supp.id} value={supp.id}>
                  {supp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="ALL">All Statuses</option>

              {/* Requisition Statuses */}
              {formData.reportType === "Purchase Requisition Report" && (
                <>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ORDERED">Ordered</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}

              {/* Purchase Order Statuses */}
              {formData.reportType === "Purchase Order Report" && (
                <>
                  <option value="ORDERED">Ordered</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}

              {/* Delivery Statuses */}
              {formData.reportType === "Delivery Report" && (
                <>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: "30px" }}>
          <button type="button" className="danger-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Generate Report
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProcurementReportForm;