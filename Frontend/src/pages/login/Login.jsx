import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./login.css";

function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(
        cleanUsername,
        password,
        remember
      );

      /*
       * Expected useAuth().login() response:
       *
       * {
       *   success: true,
       *   user: {...}
       * }
       *
       * or
       *
       * {
       *   success: false,
       *   message: "..."
       * }
       */

      if (!result?.success) {
        setError(
          result?.message ||
          "Invalid username or password."
        );
        return;
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (loginError) {
      console.error("Login error:", loginError);

      setError(
        loginError?.message ||
        "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">

        <div className="auth-brand">
          <div className="auth-logo">
            MS
          </div>

          <div>
            <h1>
              Material Stock Management
            </h1>
          </div>
        </div>

        <div className="auth-heading">
          <h2>Sign in</h2>

          <p>
            Sign in to access the system.
          </p>
        </div>

        {error && (
          <div
            className="auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <div className="auth-field">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter username"
              autoComplete="username"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Password
            </label>

            <div className="auth-password">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
                disabled={loading}
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) =>
                setRemember(
                  event.target.checked
                )
              }
              disabled={loading}
            />

            <span>
              Remember my session
            </span>
          </label>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={() =>
              navigate(
                "/forgot-password"
              )
            }
            disabled={loading}
          >
            Forgot password?
          </button>

        </form>

        <div className="signup-footer">
          <span>
            Don't have an account?
          </span>

          <Link to="/signup">
            Sign up
          </Link>
        </div>

      </section>
    </main>
  );
}

export default Login;