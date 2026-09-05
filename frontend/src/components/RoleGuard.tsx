import { Link } from "react-router-dom";
import { useSession } from "@/auth/SessionProvider";
export function RoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { user } = useSession();
  return user && roles.includes(user.role) ? (
    children
  ) : (
    <>
      <h1>Access denied</h1>
      <Link to="/dashboard">Overview</Link>
    </>
  );
}
