"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Plus, X } from "lucide-react";

import { prepareAuditFromReviewAction } from "@/server/actions/audit-actions";
import type { AuditProfile } from "@/server/services/audit-types";
import { FieldLabel, PrimaryButton, SecondaryLink, TextInput } from "@/components/audit/audit-ui";

function listToField(items: string[]) {
  return items.join("\n");
}

export function ProfileReviewForm({
  token,
  profile,
  email,
}: {
  token: string;
  profile: AuditProfile;
  email?: string | null;
}) {
  const [services, setServices] = useState(profile.productsServices);
  const [competitors, setCompetitors] = useState(profile.competitors);
  const [serviceDraft, setServiceDraft] = useState("");
  const [competitorDraft, setCompetitorDraft] = useState("");
  const [location, setLocation] = useState(profile.locations.join(", "));

  const customerKeywords = useMemo(
    () => Array.from(new Set([...profile.customerKeywords, ...services, profile.category].filter(Boolean))).slice(0, 10),
    [profile.category, profile.customerKeywords, services],
  );

  function addChip(kind: "service" | "competitor") {
    const draft = kind === "service" ? serviceDraft : competitorDraft;
    const value = draft.trim();

    if (!value) {
      return;
    }

    if (kind === "service") {
      setServices((current) => Array.from(new Set([...current, value])));
      setServiceDraft("");
      return;
    }

    setCompetitors((current) => Array.from(new Set([...current, value])));
    setCompetitorDraft("");
  }

  return (
    <form action={prepareAuditFromReviewAction} className="flex min-h-0 flex-1 flex-col">
      <input name="shareToken" type="hidden" value={token} />
      <input name="websiteUrl" type="hidden" value={profile.websiteUrl} />
      <input name="websiteDomain" type="hidden" value={profile.websiteDomain} />
      <input name="industry" type="hidden" value={profile.industry} />
      <input name="description" type="hidden" value={profile.description} />
      <input name="customerKeywords" type="hidden" value={listToField(customerKeywords)} />
      <input name="email" type="hidden" value={email ?? ""} />
      <input name="locations" type="hidden" value={location} />
      <input name="productsServices" type="hidden" value={listToField(services)} />
      <input name="competitors" type="hidden" value={listToField(competitors)} />

      <div className="grid flex-1 gap-12 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_0.92fr] lg:px-14 lg:py-12 xl:px-16">
        <div className="max-w-[690px] space-y-8">
          <div className="space-y-5">
            <div className="inline-flex rounded-full bg-[#ecebff] px-4 py-2 text-sm font-semibold text-[#5261ff]">
              Step 2 of 4
            </div>
            <div className="space-y-3">
              <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.04em] text-[#08122f] sm:text-[40px]">
                Review your business profile
              </h1>
              <p className="max-w-xl text-lg leading-7 text-[#627091]">
                We&apos;ve analysed your homepage and filled in what we found. Please check and edit anything
                that&apos;s not correct.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2.5">
              <FieldLabel htmlFor="businessName">Business name</FieldLabel>
              <TextInput id="businessName" name="businessName" defaultValue={profile.businessName} required />
            </div>

            <div className="space-y-2.5">
              <FieldLabel htmlFor="category">Business category</FieldLabel>
              <div className="relative">
                <TextInput id="category" name="category" defaultValue={profile.category} required />
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#697493]" />
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <TextInput
                id="location"
                name="locationDisplay"
                onChange={(event) => setLocation(event.currentTarget.value)}
                value={location}
              />
            </div>

            <ChipEditor
              addLabel="Add service"
              draft={serviceDraft}
              helperLabel="Services"
              items={services}
              onAdd={() => addChip("service")}
              onChangeDraft={setServiceDraft}
              onRemove={(item) => setServices((current) => current.filter((service) => service !== item))}
              placeholder="Add a service"
            />

            <ChipEditor
              addLabel="Add competitor"
              draft={competitorDraft}
              emptyText="Add competitors if you know them."
              helperLabel="Top competitors"
              isOptional
              items={competitors}
              onAdd={() => addChip("competitor")}
              onChangeDraft={setCompetitorDraft}
              onRemove={(item) => setCompetitors((current) => current.filter((competitor) => competitor !== item))}
              placeholder="Add a competitor"
            />
          </div>
        </div>

        <HomepagePreview profile={profile} />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[#e5eaf5] px-6 py-6 sm:px-10 lg:px-14 xl:px-16">
        <SecondaryLink href="/audit" className="h-[52px] px-6">
          <ArrowLeft className="size-4" />
          Back
        </SecondaryLink>
        <PrimaryButton className="h-[52px] px-7">
          Looks good, continue
          <ArrowRight className="size-5" />
        </PrimaryButton>
      </div>
    </form>
  );
}

function ChipEditor({
  addLabel,
  draft,
  emptyText,
  helperLabel,
  isOptional,
  items,
  onAdd,
  onChangeDraft,
  onRemove,
  placeholder,
}: {
  addLabel: string;
  draft: string;
  emptyText?: string;
  helperLabel: string;
  isOptional?: boolean;
  items: string[];
  onAdd: () => void;
  onChangeDraft: (value: string) => void;
  onRemove: (item: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[#101936]">
        {helperLabel} {isOptional ? <span className="font-medium text-[#6d7692]">(optional)</span> : <span className="font-medium text-[#6d7692]">(edit as needed)</span>}
      </p>

      {items.length ? (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <button
              aria-label={`Remove ${item}`}
              className="inline-flex h-10 items-center gap-3 rounded-full bg-[#f0f2f8] px-4 text-sm font-medium text-[#101936] transition hover:bg-[#e8ecf6]"
              key={item}
              onClick={() => onRemove(item)}
              type="button"
            >
              {item}
              <X className="size-4 text-[#687493]" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#6d7692]">{emptyText}</p>
      )}

      <div className="flex max-w-xl flex-col gap-3 sm:flex-row">
        <TextInput
          aria-label={placeholder}
          className="h-10 rounded-full text-sm"
          onChange={(event) => onChangeDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          value={draft}
        />
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#ecebff] px-4 text-sm font-semibold text-[#5261ff] transition hover:bg-[#e3e2ff]"
          onClick={onAdd}
          type="button"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function HomepagePreview({ profile }: { profile: AuditProfile }) {
  const services = profile.productsServices.slice(0, 3);
  const location = profile.locations[0] ?? "Australia";

  return (
    <aside className="self-center rounded-[26px] border border-[#dfe5f3] bg-white/64 p-7 shadow-[0_24px_80px_-60px_rgba(36,52,105,0.65)] backdrop-blur-xl">
      <h2 className="mb-5 text-xl font-bold tracking-[-0.02em] text-[#101936]">Homepage preview</h2>
      <div className="relative overflow-hidden rounded-[18px] bg-[#151515] p-8 text-white shadow-[0_22px_60px_-36px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_28%,rgba(255,255,255,0.26),transparent_26%),linear-gradient(120deg,rgba(0,0,0,0.82),rgba(0,0,0,0.48)_48%,rgba(214,210,198,0.34))]" />
        <div className="absolute bottom-0 right-0 h-44 w-72 rounded-tl-[90px] bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />

        <div className="relative z-10 min-h-[330px]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xl font-extrabold uppercase tracking-[-0.02em]">{profile.businessName.split(" ").slice(0, 2).join(" ")}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/78">
                {profile.category}
              </p>
            </div>
            <div className="hidden gap-6 text-xs font-bold uppercase text-white/86 sm:flex">
              {services.map((service) => (
                <span key={service}>{service}</span>
              ))}
            </div>
          </div>

          <div className="mt-24 max-w-md">
            <h3 className="text-4xl font-extrabold leading-tight tracking-[-0.05em]">
              Trusted {profile.category}
              <br />
              {location}
            </h3>
            <p className="mt-6 max-w-sm text-lg leading-7 text-white/88">
              {profile.description || `Helpful ${profile.category.toLowerCase()} for customers when it matters most.`}
            </p>
            <div className="mt-7 inline-flex rounded-lg bg-[#f4e5cd] px-6 py-3 text-sm font-semibold text-[#5e4a35]">
              Book a consultation
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
