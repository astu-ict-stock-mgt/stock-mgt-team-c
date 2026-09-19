import { Link } from "react-router-dom";
import { useState } from "react";
import "./userCards.css";

const users = [
  {
    id: "USR-001",
    name: "Abebe Kebede",
    department: "IT",
    assigned: 5,
    returned: 3,
    status: "Active",
  },
  {
    id: "USR-002",
    name: "Sara Ahmed",
    department: "Finance",
    assigned: 3,
    returned: 2,
    status: "Active",
  },
  {
    id: "USR-003",
    name: "Mekonnen Tadesse",
    department: "Administration",
    assigned: 7,
    returned: 6,
    status: "Active",
  },
];

function UserCards() {

  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase()) ||
      user.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="module-page">

      <div className="page-header">

        <div>

          <h1>User Cards</h1>

          <p>
            Track materials and assets assigned to users.
          </p>

        </div>

      </div>

      <div className="user-summary">

        <div>
          <span>Total Users</span>
          <strong>64</strong>
        </div>

        <div>
          <span>Active Assignments</span>
          <strong>132</strong>
        </div>

        <div>
          <span>Returned Items</span>
          <strong>87</strong>
        </div>

      </div>

      <div className="user-toolbar">

        <input
          placeholder="Search user, department or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select>
          <option>All Departments</option>
          <option>IT</option>
          <option>Finance</option>
          <option>Administration</option>
        </select>

      </div>

      <div className="table-card">

        <table>

          <thead>

            <tr>
              <th>User ID</th>
              <th>User</th>
              <th>Department</th>
              <th>Assigned</th>
              <th>Returned</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {filteredUsers.map((user) => (

              <tr key={user.id}>

                <td>
                  <strong>{user.id}</strong>
                </td>

                <td>{user.name}</td>

                <td>{user.department}</td>

                <td>{user.assigned}</td>

                <td>{user.returned}</td>

                <td>
                  <span className="user-status">
                    {user.status}
                  </span>
                </td>

                <td>

                  <Link
                    to={`/user-cards/${user.id}`}
                    className="table-link"
                  >
                    View Card
                  </Link>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default UserCards;