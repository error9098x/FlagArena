import { useQuery } from "@tanstack/react-query";
import type { DashboardDto } from "@flagarena/shared";
import { readApi } from "@/lib/api";
import { ErrorNotice, Loading } from "@/components/Feedback";
import { useSession } from "@/auth/SessionProvider";
import { DashboardView } from "./DashboardView";

export function DashboardPage() {
  const { user } = useSession();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => readApi<DashboardDto>("/dashboard"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  if (!user) return null;
  return <DashboardView data={query.data} user={user} />;
}
