import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import userData from "./userData";

function normalizeUser(user) {
  // Use the primary role for table display, but keep all roles for details
  const primaryRole = Array.isArray(user?.roles) && user.roles.length > 0 
    ? (user.roles[0]?.role?.name || user.roles[0]?.name || user.roles[0]) 
    : user?.role || "N/A";

  return {
    id: user?.id ?? "",
    name: user?.fullName || user?.name || "",
    username: user?.username || "",
    department: user?.department || "",
    role: primaryRole,
    allRoles: Array.isArray(user?.roles) ? user.roles : [],
    status: user?.isActive ? "Active" : "Inactive",
    email: user?.email || "",
    permissions: Array.isArray(user?.permissions) ? user.permissions : [],
  };
}

function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const [usersResult, rolesResult] = await Promise.all([
          userData.list(),
          userData.getRoles()
        ]);
        
        if (isMounted) {
          setUsers((Array.isArray(usersResult) ? usersResult : []).map(normalizeUser));
          setAvailableRoles(rolesResult);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || "Unable to load users.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();

    return users.filter((user) => {
      const matchesSearch =
        user.id.toLowerCase().includes(value) ||
        user.name.toLowerCase().includes(value) ||
        user.username.toLowerCase().includes(value) ||
        user.department.toLowerCase().includes(value) ||
        user.role.toLowerCase().includes(value);

      // Check if user has the selected role in their allRoles array
      const matchesRole = roleFilter === "All" || user.allRoles.some(r => {
        const rName = r.role?.name || r.name || r;
        return rName === roleFilter;
      }) || user.role === roleFilter;

      const matchesStatus = statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <PageHeader title="Users" description="Manage system users and access status." />
        <button className="primary-button" onClick={() => navigate("/users/new")}>
          + Add User
        </button>
      </div>

      {error && <p className="form-error" style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading users...</p>}

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />

          <select className="filter-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="All">All Roles</option>
            {availableRoles.map(r => (
              <option key={r.id || r.name} value={r.name}>{r.name}</option>
            ))}
          </select>

          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="data-card">
        {filteredUsers.length === 0 ? (
          <EmptyState title="No users found" message="Try changing your search or filter." />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Department</th>
                  <th>Primary Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isTestAccount = user.name.includes("Tester") || user.username.includes("test");
                  
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>{user.name}</span>
                          {isTestAccount && <span style={{ fontSize: '0.75rem', color: '#ff9800', background: '#fff3e0', padding: '2px 4px', borderRadius: '4px', width: 'max-content', marginTop: '2px' }}>Test Account</span>}
                        </div>
                      </td>
                      <td>{user.username}</td>
                      <td>{user.department || "-"}</td>
                      <td>{user.role} {user.allRoles.length > 1 ? `(+${user.allRoles.length - 1})` : ''}</td>
                      <td>
                        <span className={`status-badge ${user.status.toLowerCase()}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="secondary-button small"
                            onClick={() => navigate(`/users/${user.id}`)}
                          >
                            View
                          </button>
                          <button
                            className="secondary-button small"
                            onClick={() => navigate(`/users/${user.id}/edit`)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Users;
