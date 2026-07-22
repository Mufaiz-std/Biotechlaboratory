import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FiCalendar, FiLogOut, FiSettings } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin/bookings", label: "Bookings", icon: FiCalendar },
  { to: "/admin/settings", label: "Settings", icon: FiSettings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-semibold">Technician dashboard</p>
            <p className="text-muted text-sm">{user?.name}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
          >
            <FiLogOut aria-hidden />
            Logout
          </Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted hover:bg-primary-light",
                )
              }
            >
              <Icon aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
