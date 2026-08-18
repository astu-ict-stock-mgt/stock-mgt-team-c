"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/api/hooks";
import { LoginPage } from "@/components/app/login-page";
import { AppShell } from "@/components/app/app-shell";
import { FullScreenSpinner } from "@/components/app/full-screen-spinner";

export default function Page() {
  const { data, isLoading, isError, refetch } = useMe();

  // Re-fetch on tab focus (in case token expired)
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  if (isLoading) return <FullScreenSpinner label="Loading Stock Management System..." />;
  if (isError || !data) return <LoginPage />;

  return <AppShell user={data.user} permissions={new Set(data.permissions)} roles={new Set(data.roles)} />;
}
