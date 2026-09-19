import { Link, useParams } from "react-router-dom";
import "./userCards.css";

function UserCardDetails() {

  const { id } = useParams();

  return (
    <div className="module-page">

      <div className="page-header">

        <div>

          <Link to="/user-cards" className="back-link">
            ← User Cards
          </Link>

          <h1>Abebe Kebede</h1>

          <p>
            User Card · {id}
          </p>

        </div>

        <span className="user-status">
          Active
        </span>

      </div>

      <div className="user-detail-grid">

        <div className="form-card">

          <h2>User Information</h2>

          <div className="detail-list">

            <div>
              <span>User ID</span>
              <strong>USR-001</strong>
            </div>

            <div>
              <span>Department</span>
              <strong>IT</strong>
            </div>

            <div>
              <span>Position</span>
              <strong>IT Officer</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Active</strong>
            </div>

          </div>

        </div>

        <div className="form-card">

          <h2>Accountability Summary</h2>

          <div className="accountability-stats">

            <div>
              <strong>5</strong>
              <span>Assigned</span>
            </div>

            <div>
              <strong>3</strong>
              <span>Returned</span>
            </div>

            <div>
              <strong>1</strong>
              <span>Pending Return</span>
            </div>

          </div>

        </div>

      </div>

      <div className="form-card">

        <h2>Currently Assigned Materials</h2>

        <table>

          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Quantity</th>
              <th>Issued Date</th>
              <th>Condition</th>
            </tr>
          </thead>

          <tbody>

            <tr>
              <td>Dell Laptop</td>
              <td>FA-001</td>
              <td>1</td>
              <td>2026-01-25</td>
              <td>Good</td>
            </tr>

            <tr>
              <td>Wireless Mouse</td>
              <td>ITM-002</td>
              <td>1</td>
              <td>2026-01-25</td>
              <td>Good</td>
            </tr>

            <tr>
              <td>Keyboard</td>
              <td>ITM-003</td>
              <td>1</td>
              <td>2026-01-25</td>
              <td>Good</td>
            </tr>

          </tbody>

        </table>

      </div>

      <div className="form-card">

        <h2>Transaction History</h2>

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Transaction</th>
              <th>Document</th>
              <th>Item</th>
              <th>Quantity</th>
            </tr>

          </thead>

          <tbody>

            <tr>
              <td>2026-01-25</td>
              <td>Issue</td>
              <td>SIV-0001</td>
              <td>Dell Laptop</td>
              <td>1</td>
            </tr>

            <tr>
              <td>2026-02-10</td>
              <td>Return</td>
              <td>SRN-0004</td>
              <td>Keyboard</td>
              <td>1</td>
            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default UserCardDetails;