import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
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
            <label className="text-body-sm text-on-surface-variant">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Engineer"
              className="mt-1 w-full h-10 rounded border border-outline-variant bg-surface-container-lowest px-sm text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

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
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-body-sm text-on-surface-variant text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
