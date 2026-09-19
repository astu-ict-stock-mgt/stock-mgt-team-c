import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createIssueVoucher,
  fetchIssueVoucherById,
  fetchIssues,
} from "../../api/issuing";

import { list as listUsers } from "../../pages/users/userData";

import "./issuing.css";

const EMPTY_FORM = {
  storeIssueId: "",
  issuedToUserId: "",
  type: "SIV",
  remarks: "",
};

function IssueVoucherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [issueList, userList] = await Promise.all([
          fetchIssues({ status: "Completed", limit: 200 }),
          listUsers({ limit: 500 }).catch(() => [])
        ]);

        if (!isMounted) return;

        // Filter properly to only show fully issued/completed ones just in case 
        const eligibleIssues = issueList.filter(iss => iss.status?.toUpperCase() === "ISSUED" || iss.status?.toUpperCase() === "COMPLETED");
        setIssues(eligibleIssues);
        setUsers(Array.isArray(userList) ? userList : []);

        if (isEditMode) {
          const voucher = await fetchIssueVoucherById(id);
          if (isMounted) {
            setForm({
              storeIssueId: voucher.storeIssueId || "",
              issuedToUserId: voucher.metadata?.issuedToUserId || voucher.issuedToUserId || "",
              type: voucher.type || "SIV",
              remarks: voucher.remarks || "",
            });
          }
        } else if (eligibleIssues[0]) {
          setForm((current) => ({ ...current, storeIssueId: eligibleIssues[0].id }));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load issue voucher form.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isEditMode) {
      setError("Issue vouchers are created from issued store issues and cannot be edited through the current backend API.");
      return;
    }

    if (!form.storeIssueId) {
      setError("Select a completed store issue to create a voucher.");
      return;
    }

    try {
      const payload = {
        storeIssueId: form.storeIssueId,
        type: form.type,
      };

      if (form.issuedToUserId) payload.issuedToUserId = form.issuedToUserId;
      if (form.remarks) payload.remarks = form.remarks;

      const voucher = await createIssueVoucher(payload);
      navigate(`/issue-vouchers/${voucher.id}`);
    } catch (submitError) {
      setError(submitError.message || "Unable to create issue voucher.");
    }
  }

  if (loading) {
    return (
      <div className="issuing-page">
        <div className="page-header">
          <div>
            <h1>Loading voucher...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="issuing-page">
        <div className="page-header">
          <div>
            <Link to={`/issue-vouchers/${id}`} className="back-link">← Issue Vouchers</Link>
            <h1>Edit Issue Voucher</h1>
            <p>Issue voucher updates are not supported by the current backend API.</p>
          </div>
        </div>

        <div className="form-card">
          <h2>Backend limitation</h2>
          <p>Issue vouchers are generated when a store issue is completed. The current API supports viewing and creating vouchers only.</p>
          <div className="action-pane" style={{ justifyContent: "flex-start" }}>
            <Link to={`/issue-vouchers/${id}`} className="primary-button">Back to voucher</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="issuing-page">
      <div className="page-header">
        <div>
          <Link to={isEditMode ? `/issue-vouchers/${id}` : "/issue-vouchers"} className="back-link">← Issue Vouchers</Link>
          <h1>{isEditMode ? "Edit Issue Voucher" : "New Issue Voucher"}</h1>
          <p>{isEditMode ? "The issue voucher is read from the live backend." : "Create a Model 22 issue voucher from an issued store issue."}</p>
        </div>
      </div>

      {error && (
        <div className="danger-button" style={{ display: "block", marginBottom: "20px", cursor: "default" }}>
          {error}
        </div>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Voucher Information</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Related Store Issue</label>
            <select name="storeIssueId" value={form.storeIssueId} onChange={handleChange}>
              <option value="">Select issue</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>{issue.issueNo} · {issue.requisitionNo || issue.purpose || "Approved issue"}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Issue Type</label>
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="SIV">SIV — Store Issue</option>
              <option value="ISIV">ISIV — Inter-Store Issue</option>
            </select>
          </div>

          <div className="form-group">
            <label>Issued To User</label>
            <select name="issuedToUserId" value={form.issuedToUserId} onChange={handleChange}>
              <option value="">-- Optional --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
              ))}
            </select>
          </div>

          <div className="form-group form-full">
            <label>Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows="4" placeholder="Enter any voucher notes." />
          </div>
        </div>

        <div className="form-actions">
          <Link to={isEditMode ? `/issue-vouchers/${id}` : "/issue-vouchers"} className="danger-button">Cancel</Link>
          <button type="submit" className="primary-button">{isEditMode ? "Save Changes" : "Create Voucher"}</button>
        </div>
      </form>
    </div>
  );
}

export default IssueVoucherForm;