import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiActivity, FiUser, FiLock, FiArrowRight, FiShield, FiPhone, FiEye, FiEyeOff } from "react-icons/fi";
import { requestNotificationPermission, registerServiceWorker, subscribePush } from '@/utils/push';
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("+91 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await login(phone, password);
      toast.success("Welcome back");
      if ("Notification" in window && "serviceWorker" in navigator) {
        let perm = Notification.permission;
        if (perm !== "granted") {
          perm = await requestNotificationPermission();
        }
        if (perm === "granted") {
          try {
            const reg = await registerServiceWorker();
            await subscribePush(reg);
          } catch (pushErr) {
            console.warn("Push subscription failed:", pushErr);
          }
        }
      }
      const dest = location.state?.from || "/admin/bookings";
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 text-primary">
            <FiActivity className="text-3xl" aria-hidden />
            <span className="text-2xl font-bold tracking-tight">Biotech Laboratory</span>
          </div>
          <h2 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-muted">
            Secure access for authorized personnel only.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            
            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-foreground">
                Phone Number
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiPhone className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="e.g. +919876543210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                  Password
                </label>
                <a href="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiLock className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" aria-hidden />
                  ) : (
                    <FiEye className="h-5 w-5 text-muted-foreground hover:text-foreground" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            
          </div>

          <Button type="submit" className="flex w-full items-center justify-center gap-2 py-6 text-base" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
            {!loading && <FiArrowRight aria-hidden />}
          </Button>
        </form>

        {/* Disclaimer Card */}
        <div className="mt-8 flex gap-3 rounded-md border border-border bg-surface p-4 text-xs text-muted">
          <FiShield className="mt-0.5 shrink-0 text-base text-primary" aria-hidden />
          <p className="leading-relaxed text-center">
            Access to this system is restricted and monitored. Unauthorized access is strictly prohibited. <br />
            © 2026 Biotech Laboratory. ISO 9001:2015 Certified.
          </p>
        </div>

      </div>
    </div>
  );
}
