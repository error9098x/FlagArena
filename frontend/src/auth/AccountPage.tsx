import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  changePasswordSchema,
  usernameSchema,
  type UserDto,
} from "@flagarena/shared";
import { writeApi, setAccessToken } from "@/lib/api";
import { label } from "@/lib/format";
import { useSession } from "./SessionProvider";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/FormField";
import { ErrorNotice, StatusNotice } from "@/components/Feedback";
import { UserAvatar } from "@/components/UserAvatar";

export function AccountPage() {
  const { user, updateUser } = useSession();
  const navigate = useNavigate();
  const profile = useMutation({
    mutationFn: (form: FormData) =>
      writeApi<UserDto>("patch", "/auth/me", {
        username: usernameSchema.parse(form.get("username")),
      }),
    onSuccess: updateUser,
  });
  const password = useMutation({
    mutationFn: (form: FormData) =>
      writeApi(
        "post",
        "/auth/change-password",
        changePasswordSchema.parse(Object.fromEntries(form)),
      ),
    onSuccess: () => {
      setAccessToken(null);
      window.dispatchEvent(new Event("session-ended"));
      navigate("/login");
    },
  });
  return (
    <>
      <h1>Account</h1>
      {user && (
        <div className="flex items-center gap-4 mb-6">
          <UserAvatar id={user.id} name={user.username} size="lg" />
          <div>
            <p className="font-medium">{user.username}</p>
            <p className="text-xs text-muted-foreground">
              Your generated avatar stays the same when you change your name.
            </p>
          </div>
        </div>
      )}
      <dl className="metadata-grid">
        <div>
          <dt>Email</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{label(user?.role ?? "")}</dd>
        </div>
      </dl>
      {user?.mustChangePassword && (
        <StatusNotice message="Replace your temporary password to access the platform" />
      )}
      {!user?.mustChangePassword && (
        <section className="panel max-w-xl">
          <h2>Profile</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              profile.mutate(new FormData(e.currentTarget));
            }}
          >
            <FieldGroup>
              <FormField
                label="Display name"
                name="username"
                defaultValue={user?.username}
                minLength={3}
                maxLength={32}
                required
              />
              <ErrorNotice error={profile.error} />
              <StatusNotice
                message={profile.isSuccess ? "Profile saved" : undefined}
              />
              <Button disabled={profile.isPending}>Save profile</Button>
            </FieldGroup>
          </form>
        </section>
      )}
      <section className="panel max-w-xl">
        <h2>Change password</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            password.mutate(new FormData(e.currentTarget));
          }}
        >
          <FieldGroup>
            <FormField
              label={
                user?.mustChangePassword
                  ? "Temporary password"
                  : "Current password"
              }
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            <FormField
              label="New password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <ErrorNotice error={password.error} />
            <Button disabled={password.isPending}>Change password</Button>
          </FieldGroup>
        </form>
      </section>
    </>
  );
}
