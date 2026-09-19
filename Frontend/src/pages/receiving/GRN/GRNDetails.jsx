import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import receivingService from "../../../services/receivingService";

function GRNDetails() {
  const { grnNumber: id } = useParams();
  const [grn, setGRN] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    receivingService.getGRN(id)
      .then((result) => setGRN(result.grn))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container"><p>Loading GRN...</p></div>;
  if (!grn) return <div className="page-container"><p className="form-error">{error || "GRN not found."}</p><Link to="/grn">Back to GRNs</Link></div>;

  return (
    <div className="page-container">
      {error && <p className="form-error">{error}</p>}
      <div className="page-header"><div><Link to="/grn">Back to GRNs</Link><h1>Goods Receiving Note</h1><p>{grn.grnNumber}</p></div><button className="secondary-button" type="button" onClick={() => window.print()}>Print GRN</button></div>
      <div className="grn-document">
        <div className="print-only" style={{ marginBottom: "20px" }}>
          <h2>Goods Receiving Note</h2>
          <h3>{grn.grnNumber}</h3>
        </div>
        <div className="grn-information"><div><span>Supplier</span><strong>{grn.supplier?.name}</strong></div><div><span>Receipt Number</span><strong>{grn.goodsReceipt?.receiptNumber}</strong></div><div><span>Store</span><strong>{grn.store?.name}</strong></div><div><span>GRN Date</span><strong>{String(grn.grnDate).slice(0, 10)}</strong></div><div><span>Document Reference</span><strong>{grn.documentReference || "N/A"}</strong></div><div><span>Inventory Posted</span><strong>{grn.inventoryUpdated ? "Yes" : "No"}</strong></div></div>
        <table className="grn-table"><thead><tr><th>Item</th><th>Received</th><th>Accepted</th><th>Unit</th><th>Location</th><th>Condition</th></tr></thead><tbody>{grn.items.map((item) => <tr key={item.id}><td>{item.item?.name || item.item?.code}</td><td>{item.quantityReceived}</td><td>{item.acceptedQuantity}</td><td>{item.unit}</td><td>{item.location?.code || "N/A"}</td><td>{item.condition || "N/A"}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

export default GRNDetails;
