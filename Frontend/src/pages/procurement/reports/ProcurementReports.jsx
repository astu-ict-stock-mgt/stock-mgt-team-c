import { useState, useEffect } from "react";
import PageHeader from "../../../components/common/PageHeader";
import ProcurementReportForm from "./ProcurementReportForm";
import ProcurementReportDetails from "./ProcurementReportDetails";
import { fetchProcurementOverview, generateProcurementReport } from "../../../api/procurement";

function ProcurementReports() {
  const [showForm, setShowForm] = useState(false);
  const [initialReportType, setInitialReportType] = useState("Purchase Requisition Report");
  const [report, setReport] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadOverview() {
      try {
        setOverviewError(null);
        const data = await fetchProcurementOverview();
        if (isMounted) {
          setOverview(data);
        }
      } catch (error) {
        console.error("Failed to load overview", error);
        if (isMounted) setOverviewError("Failed to load procurement overview data. Please check your connection and try again.");
      } finally {
        if (isMounted) setLoadingOverview(false);
      }
    }
    loadOverview();
    return () => {
      isMounted = false;
    };
  }, [report]);

  const handleShowForm = (type = "Purchase Requisition Report") => {
    setInitialReportType(type);
    setShowForm(true);
  };

  const handleGenerate = async (formData) => {
    setLoadingForm(true);
    try {
      const generatedReport = await generateProcurementReport(formData);
      setReport(generatedReport);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to generate report", error);
      window.alert(error.message || "Failed to generate report.");
    } finally {
      setLoadingForm(false);
    }
  };

  if (report) {
    return (
      <ProcurementReportDetails
        report={report}
        onBack={() => setReport(null)}
      />
    );
  }

  if (showForm) {
    return (
      <div className="master-page">
        <PageHeader
          title="Generate Procurement Report"
          description="Generate procurement performance, requisition, purchase order, and delivery reports."
        />
        {loadingForm ? (
          <div className="form-card" style={{ padding: "20px", textAlign: "center" }}>
            Generating report...
          </div>
        ) : (
          <ProcurementReportForm
            initialReportType={initialReportType}
            onGenerate={handleGenerate}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="master-page">
      <PageHeader
        title="Procurement Reports"
        description="Procurement performance and status reports."
        actionLabel="Generate Report"
        onAction={() => handleShowForm("Purchase Requisition Report")}
      />

      {overviewError ? (
        <div style={{ color: "red", padding: "16px", border: "1px solid red", borderRadius: "8px", background: "#fef2f2", marginBottom: "30px" }}>
          <strong>Error:</strong> {overviewError}
        </div>
      ) : (
        <div className="summary-grid">
          <div className="summary-card">
            <span>Purchase Requisitions</span>
            <strong>
              {loadingOverview ? "..." : overview?.summary?.purchaseRequisitions ?? 0}
            </strong>
          </div>

          <div className="summary-card">
            <span>Purchase Orders</span>
            <strong>
              {loadingOverview ? "..." : overview?.summary?.purchaseOrders ?? 0}
            </strong>
          </div>

          <div className="summary-card">
            <span>Pending Orders</span>
            <strong>
              {loadingOverview ? "..." : (overview?.summary?.activeOrders ?? 0)}
            </strong>
          </div>

          <div className="summary-card">
            <span>Pending Deliveries</span>
            <strong>
              {loadingOverview ? "..." : (overview?.summary?.pendingDeliveries ?? 0)}
            </strong>
          </div>
        </div>
      )}

      <div className="data-card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Description</th>
                <th>Available Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Purchase Requisition Report</strong>
                </td>
                <td>Requisitions by department, requester, and status.</td>
                <td>
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => handleShowForm("Purchase Requisition Report")}
                  >
                    Generate
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Purchase Order Report</strong>
                </td>
                <td>Purchase orders by supplier, department, status, and value.</td>
                <td>
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => handleShowForm("Purchase Order Report")}
                  >
                    Generate
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Delivery Report</strong>
                </td>
                <td>Supplier delivery performance and delivery tracking.</td>
                <td>
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => handleShowForm("Delivery Report")}
                  >
                    Generate
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProcurementReports;