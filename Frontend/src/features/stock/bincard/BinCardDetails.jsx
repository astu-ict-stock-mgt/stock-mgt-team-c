import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import binCardService from "../../../services/binCardService";
import "../StockPage.css";

function BinCardDetails({ item: propItem, onBack }) {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get("itemId");

  const [cardData, setCardData] = useState(propItem || null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!propItem && Boolean(locationId));
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (propItem) {
      return undefined;
    }

    if (!locationId) {
      return undefined;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await binCardService.getByLocation(locationId, { 
          limit: 10,
          page,
          ...(itemId && { itemId })
        });
        if (!active) return;
        const list = res.data || [];
        setHistory(list);
        setTotalPages(res.pagination?.totalPages || 1);
        if (list.length > 0 && page === 1) {
          setCardData(list[0]);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load bin card history.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    queueMicrotask(load);

    return () => {
      active = false;
    };
  }, [propItem, locationId, itemId, page]);

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      navigate("/bin-cards");
    }
  }

  if (loading && history.length === 0) {
    return (
      <div className="stock-page">
        <p>Loading bin card details...</p>
      </div>
    );
  }

  if (error || (!cardData && history.length === 0 && !loading)) {
    return (
      <div className="stock-page">
        <button className="secondary-button" type="button" onClick={handleBack}>
          ← Back to Bin Cards
        </button>
        <p className="form-error" style={{ marginTop: "1rem" }}>
          {error || "No bin card transaction found for this location and item."}
        </p>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="stock-page-header">
        <div>
          <button className="secondary-button" type="button" onClick={handleBack} style={{ marginBottom: "0.5rem" }}>
            ← Back to Bin Cards
          </button>
          <h1>{cardData?.item?.name || "Item Bin Card"}</h1>
          <p>
            Item Code: <strong>{cardData?.item?.code}</strong> | 
            Location: <strong>{cardData?.location?.code}</strong>
          </p>
        </div>
      </div>

      {cardData && (
        <div className="stock-detail-card" style={{ marginBottom: "2rem" }}>
          <h2>Bin Card Metadata & State</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <strong>Item Code:</strong>
              <p>{cardData?.item?.code}</p>
            </div>
            <div>
              <strong>Unit:</strong>
              <p>{cardData?.item?.unit?.name || "N/A"}</p>
            </div>
            <div>
              <strong>Min / Max Level:</strong>
              <p>{cardData?.item?.minimum} / {cardData?.item?.maximum}</p>
            </div>
            <div>
              <strong>Location Section:</strong>
              <p>{cardData?.location?.section || "N/A"}</p>
            </div>
            <div>
              <strong>Location Bin:</strong>
              <p>{cardData?.location?.bin || "N/A"}</p>
            </div>
            <div>
              <strong>Location Shelf:</strong>
              <p>{cardData?.location?.shelf?.code || "N/A"}</p>
            </div>
            <div>
              <strong>Latest Type:</strong>
              <p>{cardData.transactionType}</p>
            </div>
            <div>
              <strong>Current Balance:</strong>
              <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#10b981" }}>{String(cardData.balance)}</p>
            </div>
            <div>
              <strong>Latest Date:</strong>
              <p>{String(cardData.transactionDate || cardData.createdAt).slice(0, 10)}</p>
            </div>
            <div>
              <strong>Latest Reference:</strong>
              <p>{cardData.transaction?.transactionNumber || "N/A"}</p>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="stock-table-container">
          <h3>Transaction History</h3>
          <table className="stock-table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>In</th>
                <th>Out</th>
                <th>Balance</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{String(h.transactionDate || h.createdAt).slice(0, 10)}</td>
                  <td>{h.transactionType}</td>
                  <td>{String(h.quantityIn)}</td>
                  <td>{String(h.quantityOut)}</td>
                  <td><strong>{String(h.balance)}</strong></td>
                  <td>
                    {h.transaction?.transactionNumber || "N/A"} 
                    <br />
                    <small>({h.transaction?.referenceType || "DIRECT"})</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="action-button"
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Page {page} of {totalPages}</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="action-button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BinCardDetails;
