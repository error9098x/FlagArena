import { useState } from "react";
import { NavLink, Outlet, Navigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Flag,
  CalendarDays,
  Trophy,
  Activity,
  PencilLine,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelectControl } from "./SelectControl";
import { useSession } from "@/auth/SessionProvider";
import { ErrorNotice, Loading } from "./Feedback";
import { label } from "@/lib/format";
import { UserAvatar } from "./UserAvatar";

export function AppLayout() {
  const { user, loading, logout } = useSession();
  const location = useLocation();
  const [error, setError] = useState<unknown>(null);
  if (loading)
    return (
      <main className="auth-page">
        <Loading />
      </main>
    );
  if (!user)
    return (
      <Navigate
        to={location.pathname.startsWith("/admin") ? "/admin/login" : "/login"}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  const preview =
    import.meta.env.DEV && sessionStorage.getItem("flagarena-preview");
  const links = [
    { to: "/dashboard", text: "Overview", icon: LayoutDashboard },
    { to: "/challenges", text: "Challenges", icon: Flag },
    { to: "/events", text: "Events", icon: CalendarDays },
    { to: "/leaderboard", text: "Leaderboard", icon: Trophy },
    { to: "/activity", text: "Activity", icon: Activity },
    ...(user.role !== "player"
      ? [
          {
            to: "/manage/challenges",
            text: user.role === "admin" ? "Challenge bank" : "My challenges",
            icon: PencilLine,
          },
          {
            to: "/author/analytics",
            text: "Author analytics",
            icon: BarChart3,
          },
        ]
      : []),
    ...(user.role === "admin"
      ? [
          { to: "/admin/users", text: "Users", icon: Users },
          { to: "/admin/solves", text: "Score corrections", icon: ListChecks },
          { to: "/admin/audit", text: "Audit log", icon: ClipboardList },
        ]
      : []),
    { to: "/account", text: "Account", icon: Settings },
  ];
  const navigation = (
    <nav aria-label="Main navigation">
      {links
        .filter((link) => !user.mustChangePassword || link.to === "/account")
        .map(({ to, text, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={18} aria-hidden="true" />
            <span>{text}</span>
          </NavLink>
        ))}
    </nav>
  );
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link to="/" className="wordmark">
          Flag<span>Arena</span>
        </Link>
        {navigation}
        <div className="sidebar-account">
          <UserAvatar id={user.id} name={user.username} size="lg" />
          <span>{user.username}</span>
          <span className="text-muted-foreground text-sm">
            {label(user.role)}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              void logout().catch(setError);
            }}
          >
            <LogOut data-icon="inline-start" />
            Log out
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <details className="mobile-navigation">
            <summary>Navigation</summary>
            {navigation}
          </details>
          <Link className="text-muted-foreground" to="/">
            FlagArena
          </Link>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <span>
            {links.find((link) => link.to === location.pathname)?.text ??
              "Workspace"}
          </span>
          <Link
            to="/account"
            className="ml-auto flex items-center gap-3 text-foreground"
          >
            <span>{user.username}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {label(user.role)}
            </Badge>
            <UserAvatar id={user.id} name={user.username} />
          </Link>
        </header>
        {preview && (
          <div className="preview-banner">
            <span>Read-only preview</span>
            <label htmlFor="preview-role">Role</label>
            <SelectControl
              id="preview-role"
              value={preview}
              onValueChange={(role) =>
                window.location.assign(`/dashboard?preview=${role}`)
              }
              options={[
                { value: "player", label: "Player" },
                { value: "author", label: "Author" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("flagarena-preview");
                window.location.assign("/login");
              }}
            >
              Exit preview
            </Button>
          </div>
        )}
        <main id="main-content" className="page-content">
          <ErrorNotice error={error} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
