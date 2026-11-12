"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAuditFromWebsite, prepareAuditFromProfile, runAuditFromProfile } from "@/server/services/audit-service";
import type { AuditProfile } from "@/server/services/audit-types";
import { splitLines } from "@/lib/utils";

const websiteSchema = z.object({
  websiteUrl: z.string().trim().min(8),
});

const profileSchema = z.object({
  shareToken: z.string().trim().min(12),
  email: z.string().trim().email().optional().or(z.literal("")),
  businessName: z.string().trim().min(2),
  websiteUrl: z.string().trim().url(),
  websiteDomain: z.string().trim().min(3),
  industry: z.string().trim().min(2),
  category: z.string().trim().min(2),
  description: z.string().trim().min(10),
  locations: z.string().trim().min(2),
  productsServices: z.string().trim().min(2),
  competitors: z.string().trim().optional(),
  customerKeywords: z.string().trim().min(2),
});

export async function createAuditAction(formData: FormData) {
  const parsed = websiteSchema.safeParse({
    websiteUrl: formData.get("websiteUrl"),
  });

  if (!parsed.success) {
    redirect(`/audit?error=${encodeURIComponent("Enter a valid website URL including http:// or https://.")}`);
  }

  let token: string;

  try {
    token = await createAuditFromWebsite(parsed.data.websiteUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not start that audit.";
    redirect(`/audit?error=${encodeURIComponent(message)}`);
  }

  redirect(`/audit/${token}/review`);
}

export async function runAuditFromReviewAction(formData: FormData) {
  const parsed = profileSchema.safeParse({
    shareToken: formData.get("shareToken"),
    email: formData.get("email"),
    businessName: formData.get("businessName"),
    websiteUrl: formData.get("websiteUrl"),
    websiteDomain: formData.get("websiteDomain"),
    industry: formData.get("industry"),
    category: formData.get("category"),
    description: formData.get("description"),
    locations: formData.get("locations"),
    productsServices: formData.get("productsServices"),
    competitors: formData.get("competitors"),
    customerKeywords: formData.get("customerKeywords"),
  });

  if (!parsed.success) {
    redirect("/audit?error=Please check the business profile fields and try again.");
  }

  const profile: AuditProfile = {
    businessName: parsed.data.businessName,
    websiteUrl: parsed.data.websiteUrl,
    websiteDomain: parsed.data.websiteDomain,
    industry: parsed.data.industry,
    category: parsed.data.category,
    description: parsed.data.description,
    locations: splitLines(parsed.data.locations),
    productsServices: splitLines(parsed.data.productsServices),
    competitors: splitLines(parsed.data.competitors ?? ""),
    customerKeywords: splitLines(parsed.data.customerKeywords),
  };

  await runAuditFromProfile({
    shareToken: parsed.data.shareToken,
    profile,
    email: parsed.data.email || null,
  });

  redirect(`/audit/${parsed.data.shareToken}`);
}

export async function prepareAuditFromReviewAction(formData: FormData) {
  const parsed = profileSchema.safeParse({
    shareToken: formData.get("shareToken"),
    email: formData.get("email"),
    businessName: formData.get("businessName"),
    websiteUrl: formData.get("websiteUrl"),
    websiteDomain: formData.get("websiteDomain"),
    industry: formData.get("industry"),
    category: formData.get("category"),
    description: formData.get("description"),
    locations: formData.get("locations"),
    productsServices: formData.get("productsServices"),
    competitors: formData.get("competitors"),
    customerKeywords: formData.get("customerKeywords"),
  });

  if (!parsed.success) {
    redirect("/audit?error=Please check the business profile fields and try again.");
  }

  const profile: AuditProfile = {
    businessName: parsed.data.businessName,
    websiteUrl: parsed.data.websiteUrl,
    websiteDomain: parsed.data.websiteDomain,
    industry: parsed.data.industry,
    category: parsed.data.category,
    description: parsed.data.description,
    locations: splitLines(parsed.data.locations),
    productsServices: splitLines(parsed.data.productsServices),
    competitors: splitLines(parsed.data.competitors ?? ""),
    customerKeywords: splitLines(parsed.data.customerKeywords),
  };

  await prepareAuditFromProfile({
    shareToken: parsed.data.shareToken,
    profile,
    email: parsed.data.email || null,
  });

  redirect(`/audit/${parsed.data.shareToken}/running`);
}
