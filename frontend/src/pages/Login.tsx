import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.login(password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? "Wrong password. Try again." : "Login failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="login-wrap">
        <h1>Dzinza</h1>
        <p className="sub">Family research, private by default.</p>
        <div className="card">
          <form onSubmit={submit}>
            {error && <div className="error">{error}</div>}
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
            </label>
            <button type="submit" disabled={busy || !password}>
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
