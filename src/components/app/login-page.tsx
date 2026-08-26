"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock, ChevronDown, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin, useMe } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { useTheme } from "@/lib/use-theme";

const Schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof Schema>;

const DEMO_ACCOUNTS = [
  { email: "admin@sms.et", role: "Administrator" },
  { email: "pao@sms.et", role: "PAO" },
  { email: "storekeeper@sms.et", role: "Storekeeper" },
  { email: "accountant@sms.et", role: "Accountant" },
  { email: "depthead@sms.et", role: "Department Head" },
  { email: "security@sms.et", role: "Security Officer" },
];

// Off unless NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true. This panel prints a working
// password for six real accounts and the form used to arrive pre-filled with
// the administrator's credentials, which must never reach a deployed build.
const DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true";
const DEMO_PASSWORD = "Password@123";

export function LoginPage() {
  const [showAccounts, setShowAccounts] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const me = useMe();
  const { theme, toggle } = useTheme();

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: DEMO_MODE
      ? { email: "admin@sms.et", password: DEMO_PASSWORD }
      : { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await login.mutateAsync(values);
      toast.success("Welcome back!");
      setTimeout(() => me.refetch(), 50);
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.message : "Login failed";
      toast.error(msg);
    }
  };

  const quickFill = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", DEMO_PASSWORD);
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "radial-gradient(120% 120% at 50% -10%, var(--card), var(--surface) 62%)" }}
    >
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle color theme"
      >
        {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
      <div className="w-full max-w-[400px]">
        {/* Brand lockup */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-inset ring-border">
            <img
              src="/astu-logo.svg"
              alt="Adama Science and Technology University"
              className="h-full w-full object-contain p-1.5"
            />
          </div>
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Adama Science &amp; Technology University
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Stock Management System
          </h1>
        </div>

        {/* Sign-in card */}
        <div className="rounded-lg border border-border bg-card p-7 shadow-pop">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Use your institutional credentials to continue.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@sms.et"
                  className="h-10 pl-9"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-10 pl-9 pr-9"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="h-10 w-full text-sm font-semibold" disabled={login.isPending}>
              {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          {/* Demo accounts — development convenience only, see DEMO_MODE above */}
          {DEMO_MODE && (
            <div className="mt-6 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setShowAccounts((s) => !s)}
                className="flex w-full items-center justify-between rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>{showAccounts ? "Hide" : "Show"} demo accounts</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAccounts ? "rotate-180" : ""}`}
                />
              </button>

              {showAccounts && (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((a) => (
                      <button
                        key={a.email}
                        type="button"
                        onClick={() => quickFill(a.email)}
                        className="rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
                      >
                        <div className="text-xs font-semibold text-foreground">{a.role}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{a.email}</div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Password for all demo accounts:{" "}
                    <span className="font-mono font-medium text-foreground">{DEMO_PASSWORD}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Adama Science and Technology University
        </p>
      </div>
    </div>
  );
}
