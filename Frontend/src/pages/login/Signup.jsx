import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./Signup.css";

function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    department: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.username.trim()) {
      return "Please enter a username.";
    }

    if (formData.username.trim().length < 3) {
      return "Username must contain at least 3 characters.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (!formData.password) {
      return "Please enter a password.";
    }

    if (formData.password.length < 6) {
      return "Password must contain at least 6 characters.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return "Passwords do not match.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (typeof register !== "function") {
      setError(
        "Registration is not available. Please check the authentication configuration."
      );

      console.error(
        "useAuth() does not provide a register() function."
      );

      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       *
       * The backend signup endpoint accepts:
       *
       * fullName
       * username
       * email
       * phone
       * password
       * department
       *
       * It does NOT accept a public role.
       *
       * Backend automatically assigns:
       * Department User
       */

      const result = await register({
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        department:
          formData.department.trim() || null,
      });

      if (!result?.success) {
        setError(
          result?.message ||
            "Unable to create the account."
        );

        return;
      }

      setSuccess(
        "Account created successfully. Redirecting to sign in..."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 800);
    } catch (registrationError) {
      console.error(
        "Registration error:",
        registrationError
      );

      setError(
        registrationError?.message ||
          "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup-page">
      <section className="signup-card">

        {/* HEADER */}

        <div className="signup-header">

          <div className="signup-logo">
            MS
          </div>

          <h1>
            Create Account
          </h1>

          <p>
            Register a new user for the
            Material Stock Management System.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div
            className="signup-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            className="signup-success"
            role="status"
          >
            {success}
          </div>
        )}

        {/* FORM */}

        <form
          className="signup-form"
          onSubmit={handleSubmit}
        >

          {/* FULL NAME */}

          <div className="signup-form-group">

            <label htmlFor="fullName">
              Full Name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              autoComplete="name"
              disabled={loading}
            />

          </div>

          {/* USERNAME */}

          <div className="signup-form-group">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              autoComplete="username"
              disabled={loading}
            />

          </div>

          {/* EMAIL + PHONE */}

          <div className="signup-form-grid">

            <div className="signup-form-group">

              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
                autoComplete="email"
                disabled={loading}
              />

            </div>

            <div className="signup-form-group">

              <label htmlFor="phone">
                Phone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                autoComplete="tel"
                disabled={loading}
              />

            </div>

          </div>

          {/* DEPARTMENT */}

          <div className="signup-form-group">

            <label htmlFor="department">
              Department
            </label>

            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              placeholder="Enter department"
              disabled={loading}
            />

            <small className="signup-help">
              New public accounts are created as
              Department User. Privileged roles are
              assigned by authorized administrators.
            </small>

          </div>

          {/* PASSWORD */}

          <div className="signup-form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="signup-password-field">

              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={loading}
              />

              <button
                type="button"
                className="signup-password-toggle"
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

          {/* CONFIRM PASSWORD */}

          <div className="signup-form-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="signup-password-field">

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
              />

              <button
                type="button"
                className="signup-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                disabled={loading}
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="signup-button"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        {/* FOOTER */}

        <div className="signup-footer">

          <span>
            Already have an account?
          </span>

          <Link to="/login">
            Sign in
          </Link>

        </div>

      </section>
    </main>
  );
}

export default Signup;