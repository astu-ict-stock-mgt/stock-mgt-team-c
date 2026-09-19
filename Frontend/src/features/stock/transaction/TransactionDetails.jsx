import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchTransactionById } from "../../../api/inventory";

import "../StockPage.css";

function TransactionDetails() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadTransaction() {
      try {
        setLoading(true);
        const data = await fetchTransactionById(id);
        if (mounted) {
          setTransaction(data);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load transaction details.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadTransaction();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="stock-page">
        <p>Loading transaction...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-page">
        <h1>Error Loading Transaction</h1>
        <p className="form-error">{error}</p>
        <Link to="/transactions" style={{ marginTop: "1rem", display: "inline-block" }}>
          ← Back to Transactions
        </Link>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="stock-page">
        <h1>Transaction Not Found</h1>
        <Link to="/transactions" style={{ marginTop: "1rem", display: "inline-block" }}>
          ← Back to Transactions
        </Link>
      </div>
    );
  }

  return (
    <div className="stock-page">

      {/* HEADER */}

      <div className="stock-page-header">

        <div>

          <Link to="/transactions">
            ← Inventory Transactions
          </Link>

          <h1>
            {transaction.transactionNumber}
          </h1>

          <p>
            {transaction.itemName}
          </p>

        </div>

        </div>


      {/* INFORMATION */}

      <div className="stock-detail-grid">

        <div className="stock-detail-card">

          <h2>
            Transaction Information
          </h2>

          <div className="detail-row">
            <span className="detail-label">
              Transaction No.
            </span>

            <span className="detail-value">
              {transaction.transactionNumber}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Date
            </span>

            <span className="detail-value">
              {transaction.date}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Type
            </span>

            <span className="detail-value">
              {transaction.type}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Document
            </span>

            <span className="detail-value">
              {transaction.document}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Direction
            </span>

            <span className="detail-value">
              {transaction.direction}
            </span>
          </div>

        </div>

        {/* ITEM */}

        <div className="stock-detail-card">

          <h2>
            Item Information
          </h2>

          <div className="detail-row">
            <span className="detail-label">
              Item
            </span>

            <span className="detail-value">
              {transaction.itemName}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Item Code
            </span>

            <span className="detail-value">
              {transaction.itemCode}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Quantity
            </span>

            <span className="detail-value">
              {transaction.quantity}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Store
            </span>

            <span className="detail-value">
              {transaction.store}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              User
            </span>

            <span className="detail-value">
              {transaction.user}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

export default TransactionDetails;