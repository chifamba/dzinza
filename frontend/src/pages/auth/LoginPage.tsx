import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../../components/ui";
import { Header, Footer } from "../../components/layout";
import { useDispatch, useSelector } from "react-redux";
import {
  loginStart,
  loginSuccess,
  loginFailure,
} from "../../store/slices/authSlice";
import { authService } from "../../services/api/authService";
import { AppDispatch, RootState } from "../../store/store";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  const { status, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/family-tree"); // Redirect to family tree canvas after login
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await authService.login({ email, password });
      dispatch(loginSuccess(response));
      navigate("/family-tree"); // Redirect to family tree canvas after successful login
    } catch (err: unknown) {
      let message = "Failed to login"; // Default
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      dispatch(loginFailure(message));
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card title="Login to your account">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com" // Mock user
                disabled={status === "loading"}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password" // Mock password
                disabled={status === "loading"}
              />
              {error && status === "failed" && (
                <p className="text-xs text-red-600">{error}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                variant="primary"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600">
              Not a member?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up
              </Link>
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default LoginPage;
