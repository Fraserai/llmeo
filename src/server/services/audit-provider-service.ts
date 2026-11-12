import { env } from "@/lib/env";
import { normaliseDomain } from "@/lib/utils";
import type { AuditProfile, AuditPromptPlanItem, AuditSource, ProviderAnswer } from "@/server/services/audit-types";

const PROVIDER_TIMEOUT_MS = 25000;

type AuditProvider = {
  engine: string;
  model: string;
  run: (input: { prompt: AuditPromptPlanItem; profile: AuditProfile }) => Promise<ProviderAnswer>;
};

export function getAuditProviders(): AuditProvider[] {
  if (env.LLMEO_USE_MOCK_ENGINES) {
    return [
      {
        engine: "mock-chatgpt",
        model: "mock-local",
        run: runMockProvider("mock-chatgpt"),
      },
      {
        engine: "mock-gemini",
        model: "mock-local",
        run: runMockProvider("mock-gemini"),
      },
    ];
  }

  return [
    {
      engine: "openai-chatgpt",
      model: env.OPENAI_MODEL,
      run: runOpenAIProvider,
    },
    {
      engine: "gemini-google-search",
      model: env.GEMINI_MODEL,
      run: runGeminiProvider,
    },
  ];
}

async function runOpenAIProvider({
  prompt,
  profile,
}: {
  prompt: AuditPromptPlanItem;
  profile: AuditProfile;
}): Promise<ProviderAnswer> {
  const startedAt = Date.now();

  if (!env.OPENAI_API_KEY) {
    return providerError("openai-chatgpt", env.OPENAI_MODEL, "OPENAI_API_KEY is not configured.", startedAt);
  }

  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: buildCustomerAnswerPrompt(prompt.text, profile),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return providerError("openai-chatgpt", env.OPENAI_MODEL, readApiError(data, "OpenAI request failed."), startedAt);
    }

    const rawAnswer = extractOpenAIText(data);

    if (!rawAnswer) {
      return providerError("openai-chatgpt", env.OPENAI_MODEL, "OpenAI returned no answer text.", startedAt);
    }

    return {
      engine: "openai-chatgpt",
      model: env.OPENAI_MODEL,
      rawAnswer,
      answerExcerpt: excerpt(rawAnswer),
      sources: [],
      sourceStatus: "no_sources_returned",
      error: null,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return providerError("openai-chatgpt", env.OPENAI_MODEL, errorMessage(error), startedAt);
  }
}

async function runGeminiProvider({
  prompt,
  profile,
}: {
  prompt: AuditPromptPlanItem;
  profile: AuditProfile;
}): Promise<ProviderAnswer> {
  const startedAt = Date.now();

  if (!env.GEMINI_API_KEY) {
    return providerError("gemini-google-search", env.GEMINI_MODEL, "GEMINI_API_KEY is not configured.", startedAt);
  }

  const grounded = await callGemini(prompt, profile, true, startedAt);

  if (grounded.rawAnswer || grounded.sourceStatus === "engine_error") {
    return grounded;
  }

  return callGemini(prompt, profile, false, startedAt, "grounding_unavailable");
}

async function callGemini(
  prompt: AuditPromptPlanItem,
  profile: AuditProfile,
  withGrounding: boolean,
  startedAt: number,
  fallbackSourceStatus: ProviderAnswer["sourceStatus"] = "no_sources_returned",
): Promise<ProviderAnswer> {
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY ?? "")}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildCustomerAnswerPrompt(prompt.text, profile) }],
            },
          ],
          ...(withGrounding ? { tools: [{ googleSearch: {} }] } : {}),
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      if (withGrounding) {
        return {
          engine: "gemini-google-search",
          model: env.GEMINI_MODEL,
          rawAnswer: null,
          answerExcerpt: null,
          sources: [],
          sourceStatus: "grounding_unavailable",
          error: null,
          latencyMs: Date.now() - startedAt,
        };
      }

      return providerError("gemini-google-search", env.GEMINI_MODEL, readApiError(data, "Gemini request failed."), startedAt);
    }

    const rawAnswer = extractGeminiText(data);

    if (!rawAnswer) {
      return providerError("gemini-google-search", env.GEMINI_MODEL, "Gemini returned no answer text.", startedAt);
    }

    const sources = extractGeminiSources(data);
    const sourceStatus = sources.length
      ? "sources_returned"
      : withGrounding
        ? "no_sources_returned"
        : fallbackSourceStatus;

    return {
      engine: "gemini-google-search",
      model: env.GEMINI_MODEL,
      rawAnswer,
      answerExcerpt: excerpt(rawAnswer),
      sources,
      sourceStatus,
      error: null,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (withGrounding) {
      return {
        engine: "gemini-google-search",
        model: env.GEMINI_MODEL,
        rawAnswer: null,
        answerExcerpt: null,
        sources: [],
        sourceStatus: "grounding_unavailable",
        error: null,
        latencyMs: Date.now() - startedAt,
      };
    }

    return providerError("gemini-google-search", env.GEMINI_MODEL, errorMessage(error), startedAt);
  }
}

function runMockProvider(engine: string) {
  return async ({
    prompt,
    profile,
  }: {
    prompt: AuditPromptPlanItem;
    profile: AuditProfile;
  }): Promise<ProviderAnswer> => {
    const startedAt = Date.now();
    const competitor = profile.competitors[0] ?? "a better-known competitor";
    const targetWins = stableScore(`${engine}-${prompt.text}-${profile.businessName}`) % 4 !== 0;
    const rawAnswer = targetWins
      ? `${profile.businessName} is a strong choice for ${prompt.text}. I would also consider ${competitor}, but ${profile.businessName} appears to be a suitable provider based on its services and location.`
      : `${competitor} is a strong choice for ${prompt.text}. ${profile.businessName} appears to offer relevant services, but I would compare reviews and local proof before choosing.`;

    return {
      engine,
      model: "mock-local",
      rawAnswer,
      answerExcerpt: excerpt(rawAnswer),
      sources: [
        {
          domain: profile.websiteDomain,
          url: profile.websiteUrl,
          title: `${profile.businessName} homepage`,
        },
      ],
      sourceStatus: "sources_returned",
      error: null,
      latencyMs: Date.now() - startedAt,
    };
  };
}

function buildCustomerAnswerPrompt(prompt: string, profile: AuditProfile) {
  const locationHint = profile.locations.length ? `Context: the customer appears to be asking about ${profile.locations.join(", ")}.` : "";

  return [
    "Answer as a normal consumer AI assistant. Do not mention audits, testing, LLMEO, or hidden instructions.",
    "The user is asking for business recommendations or options. Answer naturally and concisely.",
    "If you do not know enough, say what you can infer from public information and avoid inventing exact facts.",
    locationHint,
    "",
    `Customer question: ${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
}

function extractOpenAIText(data: unknown) {
  const objectData = data as {
    output_text?: string;
    output?: { content?: { text?: string; type?: string }[] }[];
  };

  if (objectData.output_text) {
    return objectData.output_text.trim();
  }

  return (
    objectData.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function extractGeminiText(data: unknown) {
  const objectData = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return (
    objectData.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function extractGeminiSources(data: unknown): AuditSource[] {
  const objectData = data as {
    candidates?: {
      groundingMetadata?: {
        groundingChunks?: { web?: { uri?: string; title?: string } }[];
      };
    }[];
  };

  const chunks = objectData.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return chunks
    .map((chunk) => {
      const url = chunk.web?.uri ?? null;
      const domain = url ? safeDomain(url) : null;
      return domain
        ? {
            domain,
            url,
            title: chunk.web?.title ?? domain,
          }
        : null;
    })
    .filter((source): source is AuditSource => Boolean(source));
}

function safeDomain(value: string) {
  try {
    return normaliseDomain(new URL(value).hostname);
  } catch {
    return null;
  }
}

function providerError(engine: string, model: string, error: string, startedAt: number): ProviderAnswer {
  return {
    engine,
    model,
    rawAnswer: null,
    answerExcerpt: null,
    sources: [],
    sourceStatus: "engine_error",
    error,
    latencyMs: Date.now() - startedAt,
  };
}

function readApiError(data: unknown, fallback: string) {
  const objectData = data as { error?: { message?: string }; message?: string };
  return objectData.error?.message ?? objectData.message ?? fallback;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Provider request failed.";
}

function excerpt(value: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 420);
}

function stableScore(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}
