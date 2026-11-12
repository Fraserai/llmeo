import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { claimAuditIntoWorkspace } from "@/server/services/audit-service";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  workspaceName: z.string().trim().min(2).max(80),
  auditToken: z.string().trim().min(12).optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please provide a valid name, email, password, and workspace name." },
      { status: 400 },
    );
  }

  const { auditToken, email, name, password, workspaceName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return NextResponse.json(
      { message: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const workspaceSlugBase = slugify(workspaceName);
  const existingWorkspaceCount = await prisma.workspace.count({
    where: {
      slug: {
        startsWith: workspaceSlugBase,
      },
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      slug: existingWorkspaceCount
        ? `${workspaceSlugBase}-${existingWorkspaceCount + 1}`
        : workspaceSlugBase,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash: await hash(password, 10),
      defaultWorkspaceId: workspace.id,
      memberships: {
        create: {
          workspaceId: workspace.id,
          role: "OWNER",
        },
      },
    },
  });

  if (auditToken) {
    await claimAuditIntoWorkspace({
      shareToken: auditToken,
      workspaceId: workspace.id,
      email: normalizedEmail,
    });
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    workspaceId: workspace.id,
  });
}
