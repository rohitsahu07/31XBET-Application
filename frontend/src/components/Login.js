// src/components/Login.js
import { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (submitting) return;
    setSubmitting(true);

    // reset errors
    setUsernameError(false);
    setUsernameErrorMessage("");
    setPasswordError(false);
    setPasswordErrorMessage("");

    try {
      // 1) Hit our new rotating-login endpoint
      const { data } = await axios.post("/api/users/login/", {
        username,
        password,
      }); // => { access, refresh }

      // 2) Store tokens (use 'access'/'refresh' so interceptors and WS opener can read them)
      sessionStorage.setItem("access", data.access);
      sessionStorage.setItem("refresh", data.refresh);
      // (Optional) also keep your old keys for backward compatibility
      sessionStorage.setItem("access_token", data.access);
      sessionStorage.setItem("refresh_token", data.refresh);

      // 3) Fetch the current user profile (single object)
      const me = await axios.get("/api/users/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });

      // 4) Save user in redux
      dispatch(setUser(me.data));

      // 5) Go to your first page (you had /rules)
      navigate("/rules");
    } catch (err) {
      console.error("Login failed", err);

      // Server msg (our login_view returns {"error": "..."} on bad creds)
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Incorrect username or password";

      // Show both fields as invalid (like you do now)
      setUsernameError(true);
      setUsernameErrorMessage(
        msg === "Invalid credentials" ? "Wrong username" : msg
      );
      setPasswordError(true);
      setPasswordErrorMessage(
        msg === "Invalid credentials" ? "Wrong password" : msg
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-body">
      <div className="container">
        <img
          src="frontend_assets/main_logo.png"
          alt="main"
          width={120}
          height={120}
        />

        <form onSubmit={handleLogin} style={{ marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Username"
            className="input-field mt-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            disabled={submitting}
          />
          {usernameError && (
            <div className="error-message">{usernameErrorMessage}</div>
          )}

          <input
            type="password"
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            id="password"
            name="password"
            autoComplete="current-password"
            disabled={submitting}
          />
          {passwordError && (
            <div className="error-message">{passwordErrorMessage}</div>
          )}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
