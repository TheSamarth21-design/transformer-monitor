import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@utility.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-md">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-lg">
          <Zap size={22} className="text-primary" />
          <span className="text-headline-md text-on-surface">Transformer Monitor</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded border border-outline-variant bg-surface-container-lowest p-lg flex flex-col gap-md"
        >
          {error && (
            <div className="p-sm rounded bg-error-container text-error text-body-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-body-sm text-on-surface-variant">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@utility.com"
              className="mt-1 w-full h-10 rounded border border-outline-variant bg-surface-container-lowest px-sm text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-body-sm text-on-surface-variant">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full h-10 rounded border border-outline-variant bg-surface-container-lowest px-sm text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded bg-primary text-on-primary text-body-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-body-sm text-on-surface-variant text-center">
            No account?{" "}
            <Link to="/sign-up" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
