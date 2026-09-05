import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthSessionDto, UserDto } from "@flagarena/shared";
import { refreshSession, setAccessToken, writeApi } from "@/lib/api";

interface Session {
  user: UserDto | null;
  loading: boolean;
  accept: (session: AuthSessionDto) => void;
  logout: () => Promise<void>;
  updateUser: (user: UserDto) => void;
}
const SessionContext = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const cache = useQueryClient();
  function accept(session: AuthSessionDto) {
    setAccessToken(session.accessToken);
    cache.clear();
    setUser(session.user);
  }
  useEffect(() => {
    let active = true;
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (
      import.meta.env.DEV &&
      ["player", "author", "admin"].includes(preview ?? "")
    )
      sessionStorage.setItem("flagarena-preview", preview!);
    async function load() {
      try {
        if (
          import.meta.env.DEV &&
          sessionStorage.getItem("flagarena-preview")
        ) {
          const { previewUser } = await import("../preview/data");
          if (active) setUser(previewUser());
        } else {
          const session = await refreshSession();
          if (active) {
            setAccessToken(session.accessToken);
            setUser(session.user);
          }
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const end = () => {
      setUser(null);
      cache.clear();
    };
    window.addEventListener("session-ended", end);
    return () => {
      active = false;
      window.removeEventListener("session-ended", end);
    };
  }, [cache]);
  async function logout() {
    if (import.meta.env.DEV && sessionStorage.getItem("flagarena-preview")) {
      sessionStorage.removeItem("flagarena-preview");
      window.location.assign("/login");
      return;
    }
    await writeApi("post", "/auth/logout");
    setAccessToken(null);
    cache.clear();
    setUser(null);
  }
  return (
    <SessionContext.Provider
      value={{ user, loading, accept, logout, updateUser: setUser }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider is required");
  return session;
}
