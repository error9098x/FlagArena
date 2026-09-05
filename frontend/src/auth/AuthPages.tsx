import { useState, type FormEvent, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { ArrowUpRight, Flag, Fingerprint } from "lucide-react";
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  registerSchema,
  loginSchema,
  verifySchema,
  emailRequestSchema,
  resetPasswordSchema,
  type AuthSessionDto,
} from "@flagarena/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { FormField } from "@/components/FormField";
import { ErrorNotice, StatusNotice } from "@/components/Feedback";
import { writeApi } from "@/lib/api";
import { useSession } from "./SessionProvider";

function AuthFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-layout">
        <Card className="auth-content">
          <CardHeader>
            <Link className="wordmark" to="/">
              Flag<span>Arena</span>
            </Link>
            <CardTitle>
              <h1>{title}</h1>
            </CardTitle>
            <CardDescription>
              {title === "Welcome back"
                ? "Log in to pick up where you left off."
                : title === "Admin log in"
                  ? "Sign in to manage your community's arena."
                  : title === "Create account"
                    ? "Your next discovery starts here. Join this arena as a player."
                    : title === "Verify your email"
                      ? "Enter the six-digit code from your inbox to finish setting up your account."
                      : "We'll help you get back into your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <aside className="auth-story" aria-label="About FlagArena">
          <Badge variant="outline">
            <Fingerprint />
            Built for curious minds
          </Badge>
          <div className="auth-emblem" aria-hidden="true">
            <Flag />
          </div>
          <div>
            <h2>
              The next flag
              <br />
              is yours.
            </h2>
            <p>
              Practice a new technique. Take on a challenge. Find your people in
              the arena.
            </p>
            <Button variant="outline" asChild>
              <Link to="/preview">
                Take a look inside
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
export function LoginPage({ admin = false }: { admin?: boolean }) {
  const { user, accept } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from: unknown = location.state?.from;
  const destination =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/dashboard";
  const mutation = useMutation({
    mutationFn: async (form: FormData) =>
      writeApi<AuthSessionDto>(
        "post",
        admin ? "/auth/admin/login" : "/auth/login",
        loginSchema.parse(Object.fromEntries(form)),
      ),
    onSuccess: (session) => {
      accept(session);
      navigate(session.user.mustChangePassword ? "/account" : destination);
    },
  });
  if (user)
    return (
      <Navigate
        to={user.mustChangePassword ? "/account" : "/dashboard"}
        replace
      />
    );
  return (
    <AuthFrame title={admin ? "Admin log in" : "Welcome back"}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <FieldGroup>
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <ErrorNotice error={mutation.error} />
          {isAxiosError(mutation.error) &&
            mutation.error.response?.data?.code === "EMAIL_UNVERIFIED" && (
              <Link
                to={`/verify-email?email=${encodeURIComponent(String(mutation.variables?.get("email") ?? ""))}`}
              >
                Finish verifying your email
              </Link>
            )}
          <Button disabled={mutation.isPending}>
            {mutation.isPending ? "Logging in" : "Log in"}
          </Button>
          <div className="flex justify-between gap-4">
            <Link to={admin ? "/login" : "/register"}>
              {admin ? "Player log in" : "Create account"}
            </Link>
            <Link to="/forgot-password">Reset password</Link>
          </div>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
export function RegisterPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const input = registerSchema.parse(Object.fromEntries(form));
      await writeApi("post", "/auth/register", input);
      return input.email;
    },
    onSuccess: (email) =>
      navigate(`/verify-email?email=${encodeURIComponent(email)}`),
  });
  return (
    <AuthFrame title="Create account">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <FieldGroup>
          <FormField
            label="Display name"
            name="username"
            autoComplete="nickname"
            minLength={3}
            maxLength={32}
            required
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-muted-foreground text-sm">
            Use at least 8 characters.
          </p>
          <ErrorNotice error={mutation.error} />
          <Button disabled={mutation.isPending}>
            {mutation.isPending ? "Creating account" : "Create account"}
          </Button>
          <Link to="/login">Log in</Link>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [resendUntil, setResendUntil] = useState(0);
  const verify = useMutation({
    mutationFn: () =>
      writeApi("post", "/auth/verify", verifySchema.parse({ email, code })),
  });
  const resend = useMutation({
    mutationFn: () =>
      writeApi("post", "/auth/resend", emailRequestSchema.parse({ email })),
    onSuccess: () => {
      setResendUntil(Date.now() + 60000);
      setTimeout(() => setResendUntil(0), 60000);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    verify.mutate();
  }
  return (
    <AuthFrame title="Verify your email">
      {verify.isSuccess ? (
        <>
          <StatusNotice message="Email verified" />
          <Button asChild>
            <Link to="/login">Log in</Link>
          </Button>
        </>
      ) : (
        <form onSubmit={submit}>
          <FieldGroup>
            <FormField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field data-invalid={!!verify.error}>
              <FieldLabel htmlFor="code">Verification code</FieldLabel>
              <InputOTP
                id="code"
                maxLength={6}
                value={code}
                onChange={setCode}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="^[0-9]+$"
                aria-invalid={!!verify.error}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot index={index} key={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </Field>
            <ErrorNotice error={verify.error || resend.error} />
            <StatusNotice message={resend.data?.message} />
            <Button disabled={verify.isPending || code.length !== 6}>
              {verify.isPending ? "Verifying" : "Verify email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={resend.isPending || resendUntil > Date.now()}
              onClick={() => resend.mutate()}
            >
              {resendUntil ? "Code sent" : "Resend code"}
            </Button>
            <Link to="/login">Log in</Link>
          </FieldGroup>
        </form>
      )}
    </AuthFrame>
  );
}
export function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const [token] = useState(() => window.location.hash.slice(1));
  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      reset
        ? writeApi(
            "post",
            "/auth/reset-password",
            resetPasswordSchema.parse({
              token,
              password: form.get("password"),
            }),
          )
        : writeApi(
            "post",
            "/auth/forgot-password",
            emailRequestSchema.parse(Object.fromEntries(form)),
          ),
  });
  return (
    <AuthFrame title={reset ? "Set a new password" : "Reset password"}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <FieldGroup>
          {reset ? (
            <FormField
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          ) : (
            <FormField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          )}
          <ErrorNotice error={mutation.error} />
          <StatusNotice message={mutation.data?.message} />
          <Button
            disabled={mutation.isPending || (reset && mutation.isSuccess)}
          >
            {mutation.isPending
              ? "Saving"
              : reset
                ? "Set password"
                : "Send reset link"}
          </Button>
          <Link to="/login">Log in</Link>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
