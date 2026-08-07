import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap, Mail, Lock, User, ShieldCheck, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Substation Engineer");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (isAuthenticated) {
    navigate(from, { replace: true });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }
        await register(name, email, password, role);
        setSuccessMessage("Member registered successfully! Redirecting...");
      } else {
        await login(email, password);
        setSuccessMessage("Login successful! Redirecting...");
      }
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("admin@transformer.com");
    setPassword("admin123");
    setErrorMessage("");
    setLoading(true);
    try {
      await login("admin@transformer.com", "admin123");
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage("Demo login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#121216] text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-error/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-lg font-bold tracking-wide">TRANSFORMER MONITOR</span>
            <span className="text-xs text-white/50 block font-mono">Smart Grid & Protection System</span>
          </div>
        </div>
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles size={14} className="text-warning" />
          <span>1-Click Demo Login</span>
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div className="bg-[#1a1a22]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
          
          {/* Card Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white">
              {isRegisterMode ? "Register Member Account" : "Member Sign In"}
            </h1>
            <p className="text-xs text-white/60">
              {isRegisterMode
                ? "Create a new engineer or operator account with email"
                : "Enter your registered email and password to access dashboard"}
            </p>
          </div>

          {/* Toggle Pills (Login / Register) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorMessage("");
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                !isRegisterMode
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorMessage("");
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                isRegisterMode
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Register Member
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Full Name Input (Register Mode Only) */}
            {isRegisterMode && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-white/80">Full Name</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3 text-white/40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/80">Email Address</label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@transformer.com"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/80">Password</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Role Select (Register Mode Only) */}
            {isRegisterMode && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-white/80">Substation Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#1e1e28] border border-white/10 text-sm font-medium text-white focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="Substation Engineer">Substation Grid Engineer</option>
                  <option value="Field Maintenance Technician">Field Maintenance Technician</option>
                  <option value="SCADA System Operator">SCADA System Operator</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-primary/25"
            >
              <span>{loading ? "Processing..." : isRegisterMode ? "REGISTER NEW MEMBER" : "SIGN IN TO DASHBOARD"}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Admin Test Credentials Banner */}
          {!isRegisterMode && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs flex flex-col gap-1">
              <span className="font-bold text-white/80 flex items-center gap-1">
                <ShieldCheck size={14} className="text-primary" />
                Default Test Account Credentials:
              </span>
              <span className="font-mono text-white/60">Email: admin@transformer.com</span>
              <span className="font-mono text-white/60">Password: admin123</span>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-white/40 z-10">
        Smart Transformer Monitoring & Automated Protection Interlock System &copy; 2026
      </div>

    </div>
  );
}
