import { useState } from "react";

function Settings() {
  const [
    emailNotifications,
    setEmailNotifications,
  ] = useState(true);

  const [
    compactMode,
    setCompactMode,
  ] = useState(false);

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1>
            Settings
          </h1>

          <p>
            Configure system preferences.
          </p>
        </div>
      </div>

      <div className="form-card">

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={
                emailNotifications
              }
              onChange={(event) =>
                setEmailNotifications(
                  event.target.checked
                )
              }
            />

            {" "}
            Email notifications
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(event) =>
                setCompactMode(
                  event.target.checked
                )
              }
            />

            {" "}
            Compact interface
          </label>
        </div>

      </div>
    </div>
  );
}

export default Settings;