import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceContext } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { session, business } = await requireWorkspaceContext();

  return (
    <AppShell businessName={business?.name} userName={session.user.name}>
      {children}
    </AppShell>
  );
}
