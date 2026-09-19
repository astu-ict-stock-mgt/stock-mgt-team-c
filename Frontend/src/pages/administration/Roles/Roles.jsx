import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";

import RoleDetails from "./RoleDetails";
import RoleForm from "./RoleForm";
import roleData from "./roleData";

function Roles({ view = "list" }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await roleData.list();
      setRoles(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "list") {
      loadRoles();
    }
  }, [view]);

  const filteredRoles = useMemo(() => {
    const value = search.toLowerCase().trim();
    return roles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(value) ||
        (role.description || "").toLowerCase().includes(value);
      return matchesSearch;
    });
  }, [roles, search]);

  if (view === "new") {
    return <RoleForm onCancel={() => navigate("/roles")} onSaveSuccess={() => navigate("/roles")} />;
  }

  if (view === "edit") {
    if (!id) return <div>Missing Role ID</div>;
    return <RoleForm roleId={id} onCancel={() => navigate(`/roles/${id}`)} onSaveSuccess={() => navigate(`/roles/${id}`)} />;
  }

  if (view === "details") {
    if (!id) return <div>Missing Role ID</div>;
    return <RoleDetails roleId={id} onBack={() => navigate("/roles")} onEdit={() => navigate(`/roles/${id}/edit`)} />;
  }

  return (
    <div className="master-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <PageHeader title="Roles & Permissions" description="Manage system roles and access responsibilities." />
        <button className="primary-button" onClick={() => navigate("/roles/new")}>
          + Create Role
        </button>
      </div>

      {error && <p className="form-error" style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading roles...</p>}

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search roles..." />
        </div>
      </div>

      <div className="data-card">
        {filteredRoles.length === 0 ? (
          <EmptyState title="No roles found" message="Try changing your search." />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Users</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => {
                  const hasFullAccess = role.permissions?.includes("*");
                  return (
                    <tr key={role.id}>
                      <td style={{ fontWeight: '500' }}>{role.name}</td>
                      <td>{role.description || "-"}</td>
                      <td>{role.userCount || 0}</td>
                      <td>
                        {hasFullAccess ? (
                          <span style={{ color: '#0d47a1', fontWeight: 'bold' }}>⭐ Full Access</span>
                        ) : (
                          <span>{role.permissions?.length || 0} specific</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="secondary-button small"
                            onClick={() => navigate(`/roles/${role.id}`)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="secondary-button small"
                            onClick={() => navigate(`/roles/${role.id}/edit`)}
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

export default Roles;
