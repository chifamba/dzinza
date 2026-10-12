import { useEffect, useState, type ReactElement } from "react";
import { Link, Route, Routes, useNavigate, useLocation, Navigate } from "react-router-dom";
import { api, ApiError } from "./api/client";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TreeView from "./pages/TreeView";
import PersonDetail from "./pages/PersonDetail";
import Sources from "./pages/Sources";

function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        Dzinza
      </Link>
      <nav>
        <Link to="/">Trees</Link>
      </nav>
      <div className="spacer" />
      <button className="ghost small-btn" onClick={onLogout}>
        Log out
      </button>
    </header>
  );
}

function RequireAuth({ children }: { children: ReactElement }) {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then(() => alive && setState("ok"))
      .catch((e) => {
        if (alive) setState(e instanceof ApiError && e.status === 401 ? "denied" : "denied");
      });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  if (state === "checking") return <div className="page muted">Checking session…</div>;
  if (state === "denied") return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <>
              <TopBar onLogout={handleLogout} />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trees/:treeId" element={<TreeView />} />
                <Route path="/trees/:treeId/sources" element={<Sources />} />
                <Route path="/persons/:personId" element={<PersonDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
