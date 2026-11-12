import dns from "node:dns/promises";
import net from "node:net";

import { normaliseDomain, titleCase } from "@/lib/utils";
import type { AuditProfile } from "@/server/services/audit-types";

const HOMEPAGE_TIMEOUT_MS = 6000;
const MAX_HOMEPAGE_TEXT = 6000;
const MAX_REDIRECTS = 3;

type HomepageSnapshot = {
  url: string;
  domain: string;
  title: string;
  metaDescription: string;
  h1s: string[];
  text: string;
};

export function validateAuditWebsiteUrl(rawValue: string) {
  const raw = rawValue.trim();

  if (!raw) {
    throw new Error("Enter a website URL.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid URL including http:// or https://.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Website URL must start with http:// or https://.");
  }

  url.hash = "";

  return url;
}

export async function assertPublicFetchUrl(url: URL) {
  const host = url.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Localhost URLs cannot be audited.");
  }

  if (isBlockedIp(host)) {
    throw new Error("Private or internal network URLs cannot be audited.");
  }

  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new Error("We could not resolve that website domain.");
  }

  if (addresses.some((address) => isBlockedIp(address.address))) {
    throw new Error("Private or internal network URLs cannot be audited.");
  }
}

export async function fetchHomepageSnapshot(startUrl: URL): Promise<HomepageSnapshot> {
  const finalResponse = await fetchWithSafeRedirects(startUrl);
  const contentType = finalResponse.headers.get("content-type") ?? "";

  if (!finalResponse.ok) {
    throw new Error(`Homepage returned HTTP ${finalResponse.status}.`);
  }

  if (!contentType.includes("text/html")) {
    throw new Error("Homepage did not return HTML content.");
  }

  const html = await finalResponse.text();
  const finalUrl = validateAuditWebsiteUrl(finalResponse.url);
  const text = extractVisibleText(html).slice(0, MAX_HOMEPAGE_TEXT);

  return {
    url: finalUrl.toString(),
    domain: normaliseDomain(finalUrl.hostname),
    title: extractTitle(html),
    metaDescription: extractMetaDescription(html),
    h1s: extractH1s(html),
    text,
  };
}

export function inferProfileFromHomepage(snapshot: HomepageSnapshot): AuditProfile {
  const text = `${snapshot.title}\n${snapshot.metaDescription}\n${snapshot.h1s.join("\n")}\n${snapshot.text}`;
  const businessName = inferBusinessName(snapshot);
  const productsServices = inferProductsAndServices(text);
  const locations = inferLocations(text);
  const category = inferCategory(text, productsServices);
  const industry = inferIndustry(text, category);
  const description =
    snapshot.metaDescription ||
    snapshot.text.slice(0, 280) ||
    `${businessName} provides ${category.toLowerCase()} services.`;

  return {
    businessName,
    websiteUrl: snapshot.url,
    websiteDomain: snapshot.domain,
    industry,
    category,
    description: cleanWhitespace(description).slice(0, 500),
    locations,
    productsServices,
    competitors: [],
    customerKeywords: Array.from(new Set([category, ...productsServices])).slice(0, 6),
  };
}

async function fetchWithSafeRedirects(url: URL, redirects = 0): Promise<Response> {
  await assertPublicFetchUrl(url);

  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(HOMEPAGE_TIMEOUT_MS),
    headers: {
      "user-agent": "LLMEO Local MVP Audit Bot",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (isRedirect(response.status)) {
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("Homepage redirected too many times.");
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Homepage redirected without a location.");
    }

    const nextUrl = validateAuditWebsiteUrl(new URL(location, url).toString());
    return fetchWithSafeRedirects(nextUrl, redirects + 1);
  }

  return response;
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

function isBlockedIp(value: string) {
  const ipVersion = net.isIP(value);

  if (!ipVersion) {
    return false;
  }

  if (ipVersion === 4) {
    const parts = value.split(".").map(Number);
    const [first, second] = parts;

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127) ||
      first >= 224
    );
  }

  const normalized = value.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function extractTitle(html: string) {
  return decodeHtml(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
}

function extractMetaDescription(html: string) {
  return decodeHtml(
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      matchFirst(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i),
  );
}

function extractH1s(html: string) {
  return Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi))
    .map((match) => decodeHtml(stripTags(match[1])))
    .map(cleanWhitespace)
    .filter(Boolean)
    .slice(0, 5);
}

function extractVisibleText(html: string) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  return cleanWhitespace(decodeHtml(stripTags(withoutNoise)));
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function matchFirst(value: string, regex: RegExp) {
  return value.match(regex)?.[1] ?? "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferBusinessName(snapshot: HomepageSnapshot) {
  const siteName = snapshot.title.split(/\s[-|:]\s/)[0]?.trim();
  const h1Name = snapshot.h1s.find((h1) => h1.length >= 2 && h1.length <= 80);
  const domainName = titleCase(snapshot.domain.split(".")[0]?.replace(/[-_]+/g, " ") ?? "Business");

  return cleanWhitespace(siteName || h1Name || domainName).slice(0, 80);
}

function inferIndustry(text: string, category: string) {
  const haystack = text.toLowerCase();
  const matches: [string, string[]][] = [
    ["Trades and home services", ["plumb", "electric", "builder", "roof", "hvac", "maintenance"]],
    ["Legal services", ["lawyer", "legal", "solicitor", "family law", "conveyancing"]],
    ["Accounting and finance", ["accountant", "bookkeep", "tax", "mortgage", "financial advice"]],
    ["Health and wellness", ["clinic", "dental", "physio", "medical", "therapy", "health"]],
    ["Real estate", ["real estate", "property", "buyers agent", "rentals"]],
    ["Marketing and technology", ["marketing", "seo", "software", "saas", "automation", "ai"]],
    ["Hospitality and tourism", ["hotel", "restaurant", "cafe", "tour", "travel"]],
  ];

  return matches.find(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))?.[0] ?? category;
}

function inferCategory(text: string, productsServices: string[]) {
  const haystack = text.toLowerCase();
  const matches: [string, string[]][] = [
    ["Plumbing", ["plumb", "blocked drain", "hot water"]],
    ["Electrician", ["electric", "switchboard", "solar"]],
    ["Law firm", ["lawyer", "solicitor", "legal"]],
    ["Accounting firm", ["accountant", "bookkeeping", "tax return"]],
    ["Dental clinic", ["dentist", "dental"]],
    ["Real estate agency", ["real estate", "property management"]],
    ["AI consulting", ["ai consulting", "automation", "agents", "artificial intelligence"]],
    ["Marketing agency", ["marketing", "seo", "advertising"]],
  ];

  return matches.find(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))?.[0] ?? productsServices[0] ?? "Business";
}

function inferProductsAndServices(text: string) {
  const haystack = text.toLowerCase();
  const serviceMatches: [string, string[]][] = [
    ["Emergency service", ["emergency"]],
    ["Hot water repairs", ["hot water"]],
    ["Blocked drain repairs", ["blocked drain", "drain cleaning"]],
    ["Commercial maintenance", ["commercial maintenance", "strata"]],
    ["Tax returns", ["tax return"]],
    ["Bookkeeping", ["bookkeeping"]],
    ["Family law", ["family law"]],
    ["Property management", ["property management"]],
    ["AI automation", ["ai automation", "automation"]],
    ["SEO", ["seo", "search engine optimisation", "search engine optimization"]],
  ];

  const matches = serviceMatches
    .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))
    .map(([service]) => service);

  return matches.length ? matches.slice(0, 6) : ["Core service"];
}

function inferLocations(text: string) {
  const haystack = text.toLowerCase();
  const locations = [
    "Australia",
    "Brisbane",
    "Sydney",
    "Melbourne",
    "Perth",
    "Adelaide",
    "Canberra",
    "Hobart",
    "Darwin",
    "Gold Coast",
    "Sunshine Coast",
    "Newcastle",
    "Geelong",
    "Townsville",
    "Cairns",
  ];

  const matches = locations.filter((location) => haystack.includes(location.toLowerCase()));
  return matches.length ? matches.slice(0, 5) : ["Australia"];
}
