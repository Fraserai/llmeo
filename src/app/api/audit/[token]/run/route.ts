import { NextResponse } from "next/server";

import { getAuditForToken, runPreparedAudit } from "@/server/services/audit-service";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await params;

  try {
    const status = await runPreparedAudit(token);
    const audit = await getAuditForToken(token);
    const missingKeys = audit?.results.some((result) => result.error?.includes("API_KEY is not configured"));

    return NextResponse.json({
      ok: true,
      status,
      message:
        status === "failed" && missingKeys
          ? "OpenAI or Gemini API keys are missing. Add them to your .env to run live audits."
          : undefined,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "We couldn't complete the audit. Please try again.",
      },
      { status: 500 },
    );
  }
}
