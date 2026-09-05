import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "@/auth/SessionProvider";
import {
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  PasswordRecoveryPage,
} from "@/auth/AuthPages";
import { RoleGuard } from "@/components/RoleGuard";
const AppLayout = lazy(() =>
  import("@/components/AppLayout").then((module) => ({
    default: module.AppLayout,
  })),
);
const AccountPage = lazy(() =>
  import("@/auth/AccountPage").then((module) => ({
    default: module.AccountPage,
  })),
);
import { Loading } from "@/components/Feedback";
import {
  ActivityPage,
  AuditPage,
  AuthorAnalyticsPage,
} from "@/dashboard/RecordPages";
import { ChallengeListPage } from "@/challenges/ChallengeListPage";
const LandingPage = lazy(() =>
  import("@/landing/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const PreviewPage = lazy(() =>
  import("@/landing/PreviewPage").then((module) => ({
    default: module.PreviewPage,
  })),
);
const LeaderboardPage = lazy(() =>
  import("@/leaderboard/LeaderboardPage").then((module) => ({
    default: module.LeaderboardPage,
  })),
);

const DashboardPage = lazy(() =>
  import("@/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ChallengeDetailPage = lazy(() =>
  import("@/challenges/ChallengeDetailPage").then((module) => ({
    default: module.ChallengeDetailPage,
  })),
);
const ChallengeEditor = lazy(() =>
  import("@/challenges/ChallengeEditor").then((module) => ({
    default: module.ChallengeEditor,
  })),
);
const EventListPage = lazy(() =>
  import("@/events/EventPages").then((module) => ({
    default: module.EventListPage,
  })),
);
const EventDetailPage = lazy(() =>
  import("@/events/EventDetailPage").then((module) => ({
    default: module.EventDetailPage,
  })),
);
const EventEditor = lazy(() =>
  import("@/events/EventEditor").then((module) => ({
    default: module.EventEditor,
  })),
);
const UserManagement = lazy(() =>
  import("@/admin/UserManagement").then((module) => ({
    default: module.UserManagement,
  })),
);
const ScoreCorrections = lazy(() =>
  import("@/admin/ScoreCorrections").then((module) => ({
    default: module.ScoreCorrections,
  })),
);

const cache = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="auth-page">
        <div>
          <h1>Page could not be displayed</h1>
          <button onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
function PasswordGuard({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  if (user?.mustChangePassword && location.pathname !== "/account")
    return <Navigate to="/account" replace />;
  return children;
}
function ApplicationRoutes() {
  const { loading } = useSession();
  if (loading)
    return (
      <main className="auth-page">
        <Loading />
      </main>
    );
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route path="/admin/login" element={<LoginPage admin />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
      <Route path="/reset-password" element={<PasswordRecoveryPage reset />} />
      <Route
        element={
          <PasswordGuard>
            <AppLayout />
          </PasswordGuard>
        }
      >
        <Route
          path="/admin"
          element={
            <RoleGuard roles={["admin"]}>
              <Navigate to="/dashboard" replace />
            </RoleGuard>
          }
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/challenges" element={<ChallengeListPage />} />
        <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
        <Route path="/events" element={<EventListPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route
          path="/manage/challenges"
          element={
            <RoleGuard roles={["admin", "author"]}>
              <ChallengeListPage manage />
            </RoleGuard>
          }
        />
        <Route
          path="/manage/challenges/new"
          element={
            <RoleGuard roles={["admin", "author"]}>
              <ChallengeEditor />
            </RoleGuard>
          }
        />
        <Route
          path="/manage/challenges/:id"
          element={
            <RoleGuard roles={["admin", "author"]}>
              <ChallengeEditor />
            </RoleGuard>
          }
        />
        <Route
          path="/author/analytics"
          element={
            <RoleGuard roles={["admin", "author"]}>
              <AuthorAnalyticsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/manage/events/new"
          element={
            <RoleGuard roles={["admin"]}>
              <EventEditor />
            </RoleGuard>
          }
        />
        <Route
          path="/manage/events/:id"
          element={
            <RoleGuard roles={["admin"]}>
              <EventEditor />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleGuard roles={["admin"]}>
              <UserManagement />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/solves"
          element={
            <RoleGuard roles={["admin"]}>
              <ScoreCorrections />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RoleGuard roles={["admin"]}>
              <AuditPage />
            </RoleGuard>
          }
        />
        <Route
          path="*"
          element={
            <>
              <h1>Page not found</h1>
              <Link to="/dashboard">Overview</Link>
            </>
          }
        />
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={cache}>
        <BrowserRouter>
          <SessionProvider>
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <Suspense fallback={<Loading />}>
              <ApplicationRoutes />
            </Suspense>
          </SessionProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
