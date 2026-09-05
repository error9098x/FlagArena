import { useEffect, useReducer, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Flag,
  CalendarDays,
  Trophy,
  Activity,
  PencilLine,
  Users,
  ClipboardList,
  BarChart3,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectControl } from "@/components/SelectControl";
import { UserAvatar } from "@/components/UserAvatar";
import { demoReducer, seedDemo, type DemoRole } from "./demo-state";
import {
  ChallengeLibrary,
  ChallengeDetail,
  ChallengeEditor,
  Panel,
  PageTitle,
} from "./DemoChallenges";
import {
  DemoOverview,
  DemoLeaderboard,
  DemoAnalytics,
  ActivityList,
  AuditList,
} from "./DemoInsights";
import {
  DemoEvents,
  DemoEventDetail,
  DemoEventEditor,
  DemoUsers,
} from "./DemoManagement";
import "./demo.css";

const names = {
  player: "Arjun Mehta",
  author: "Mira Shah",
  admin: "Nisha Rao",
};
const icons = {
  Overview: LayoutDashboard,
  Challenges: Flag,
  Events: CalendarDays,
  Leaderboard: Trophy,
  Activity,
  "Create challenge": PencilLine,
  "Review queue": ClipboardList,
  Users,
  "Audit log": ClipboardList,
  Analytics: BarChart3,
};
type View = keyof typeof icons;
const navigation: Record<DemoRole, View[]> = {
  player: ["Overview", "Challenges", "Events", "Leaderboard", "Activity"],
  author: [
    "Overview",
    "Challenges",
    "Create challenge",
    "Analytics",
    "Events",
    "Activity",
  ],
  admin: [
    "Overview",
    "Review queue",
    "Challenges",
    "Events",
    "Users",
    "Audit log",
  ],
};

export function PreviewPage() {
  const [params] = useSearchParams();
  const requested = params.get("role");
  const role: DemoRole =
    requested === "admin" || requested === "author" ? requested : "player";
  // Each role is an independent scenario. Switching roles or refreshing starts fresh.
  return <PreviewWorkspace key={role} role={role} />;
}
function PreviewWorkspace({ role }: { role: DemoRole }) {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") ?? "Overview";
  const id = params.get("id");
  const eventId = params.get("event") ?? undefined;
  const [state, dispatch] = useReducer(demoReducer, role, seedDemo);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const go = (next: string, id?: string, event?: string) => {
    setParams({
      role,
      view: next,
      ...(id ? { id } : {}),
      ...(event ? { event } : {}),
    });
    setMobileOpen(false);
  };
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, id, eventId]);
  const challenge = state.challenges.find(
    (c) => c.id === id && (role !== "player" || c.status === "approved"),
  );
  const event = state.events.find((e) => e.id === id);
  const nav = (
    <nav aria-label="Workspace navigation">
      {navigation[role].map((item) => {
        const Icon = icons[item];
        const active =
          view === item ||
          (item === "Challenges" &&
            ["Challenge", "Edit challenge"].includes(view)) ||
          (item === "Events" &&
            ["Event", "Create event", "Edit event"].includes(view));
        return (
          <button
            key={item}
            type="button"
            onClick={() => go(item)}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item : undefined}
          >
            <Icon size={18} />
            <span>
              {item === "Challenges" && role === "author"
                ? "My challenges"
                : item === "Analytics"
                  ? "Performance"
                  : item}
            </span>
            {item === "Review queue" && (
              <small>
                {state.challenges.filter((c) => c.status === "pending").length}
              </small>
            )}
          </button>
        );
      })}
    </nav>
  );
  return (
    <div className="arena-shell" data-collapsed={collapsed}>
      <aside className="arena-sidebar">
        <div className="arena-sidebar-brand">
          <Link className="wordmark" to="/" aria-label="FlagArena home">
            {collapsed ? (
              <Flag size={22} />
            ) : (
              <>
                Flag<span>Arena</span>
              </>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <div className="arena-sidebar-nav">{nav}</div>
        <div className="arena-sidebar-account">
          <UserAvatar id={names[role]} name={names[role]} size="lg" />
          <div>
            <strong>{names[role]}</strong>
            <span>{role[0]!.toUpperCase() + role.slice(1)}</span>
          </div>
        </div>
      </aside>
      <div className="arena-workspace">
        <header className="arena-toolbar">
          <Button
            className="arena-mobile-menu"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <span className="arena-breadcrumb">
            FlagArena<span>/</span>
            {view}
          </span>
          <Badge variant="info">Interactive demo</Badge>
          <div className="arena-role-picker">
            <SelectControl
              aria-label="Preview role"
              value={role}
              onValueChange={(role) => setParams({ role })}
              options={[
                { value: "player", label: "Player" },
                { value: "author", label: "Author" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft data-icon="inline-start" />
              Back
            </Link>
          </Button>
        </header>
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="arena-mobile-dialog">
            <DialogHeader>
              <DialogTitle>Navigation</DialogTitle>
            </DialogHeader>
            <div className="arena-sidebar-nav">{nav}</div>
          </DialogContent>
        </Dialog>
        <main id="main-content" className="arena-main">
          {view === "Overview" ? (
            <DemoOverview state={state} go={go} />
          ) : view === "Challenges" || view === "My challenges" ? (
            <ChallengeLibrary state={state} go={go} />
          ) : view === "Review queue" && role === "admin" ? (
            <ChallengeLibrary state={state} go={go} review />
          ) : view === "Challenge" && challenge ? (
            <ChallengeDetail
              key={`${challenge.id}-${eventId}`}
              challenge={challenge}
              state={state}
              dispatch={dispatch}
              go={go}
              eventId={eventId}
            />
          ) : role !== "player" &&
            (view === "Create challenge" ||
              (view === "Edit challenge" && challenge)) ? (
            <ChallengeEditor
              key={challenge?.id ?? "new"}
              initial={view === "Edit challenge" ? challenge : undefined}
              onSave={(challenge) => {
                dispatch({
                  type: "save",
                  challenge,
                  at: new Date().toISOString(),
                });
                go("Challenges");
              }}
            />
          ) : view === "Leaderboard" ? (
            <DemoLeaderboard
              key={eventId ?? "practice"}
              state={state}
              go={go}
              eventId={eventId}
            />
          ) : view === "Events" ? (
            <DemoEvents state={state} go={go} />
          ) : view === "Event" && event ? (
            <DemoEventDetail
              event={event}
              state={state}
              dispatch={dispatch}
              go={go}
            />
          ) : role === "admin" &&
            (view === "Create event" || (view === "Edit event" && event)) ? (
            <DemoEventEditor
              initial={event}
              state={state}
              onSave={(event) => {
                dispatch({
                  type: "event",
                  event,
                  at: new Date().toISOString(),
                });
                go("Event", event.id);
              }}
            />
          ) : view === "Users" && role === "admin" ? (
            <DemoUsers state={state} dispatch={dispatch} />
          ) : view === "Analytics" && role !== "player" ? (
            <DemoAnalytics state={state} go={go} />
          ) : view === "Activity" ? (
            <>
              <PageTitle title="Activity" />
              <Panel
                title={role === "player" ? "Submissions" : "Challenge activity"}
              >
                {role === "player" ? (
                  <ActivityList state={state} go={go} />
                ) : (
                  <AuditList state={state} />
                )}
              </Panel>
            </>
          ) : view === "Audit log" && role === "admin" ? (
            <>
              <PageTitle title="Audit log" />
              <Panel title="Administrative changes">
                <AuditList state={state} />
              </Panel>
            </>
          ) : (
            <>
              <PageTitle title="Page not found" />
              <Button onClick={() => go("Overview")}>Return to overview</Button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
