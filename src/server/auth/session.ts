import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/server/auth/options";

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireWorkspaceContext() {
  const session = await requireSession();

  if (!session.user.workspaceId) {
    redirect("/onboarding");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    include: {
      businesses: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!workspace) {
    redirect("/onboarding");
  }

  return {
    session,
    workspace,
    business: workspace.businesses[0] ?? null,
  };
}
