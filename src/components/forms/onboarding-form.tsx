import { createBusinessProfileAction } from "@/server/actions/workspace-actions";
import { AU_ONBOARDING_EXAMPLES, AU_STATES } from "@/lib/constants/australia";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function OnboardingForm() {
  return (
    <form action={createBusinessProfileAction} className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <Card className="border-white/70 bg-white/95">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your business profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Business name" name="businessName" defaultValue={AU_ONBOARDING_EXAMPLES.businessName} />
          <Field label="Website domain" name="websiteDomain" defaultValue={AU_ONBOARDING_EXAMPLES.websiteDomain} />
          <Field label="Industry" name="industry" defaultValue={AU_ONBOARDING_EXAMPLES.industry} />
          <Field label="Category" name="category" defaultValue={AU_ONBOARDING_EXAMPLES.category} />
          <Field label="States covered" name="states" defaultValue="QLD" helper={`Use Australian state abbreviations like ${AU_STATES.join(", ")}.`} />
          <TextAreaField
            className="md:col-span-2"
            label="Business description"
            name="description"
            defaultValue={AU_ONBOARDING_EXAMPLES.description}
          />
          <TextAreaField
            label="Target locations"
            name="locations"
            defaultValue={AU_ONBOARDING_EXAMPLES.locations.join("\n")}
            helper="One suburb, city, or service area per line."
          />
          <TextAreaField
            label="Products and services"
            name="productsServices"
            defaultValue={AU_ONBOARDING_EXAMPLES.productsServices.join("\n")}
            helper="One service or product per line."
          />
          <TextAreaField
            label="Competitors"
            name="competitors"
            defaultValue={AU_ONBOARDING_EXAMPLES.competitors.join("\n")}
            helper="Add the competitors customers mention most often."
          />
          <TextAreaField
            label="Target customer keywords"
            name="customerKeywords"
            defaultValue={AU_ONBOARDING_EXAMPLES.customerKeywords.join("\n")}
            helper="Use the phrases a real Australian customer would ask an AI assistant."
          />
        </CardContent>
      </Card>

      <Card className="border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.95))]">
        <CardHeader>
          <CardTitle className="text-xl">What happens next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
          <p>We will generate prompt sets, identify competitors that appear instead of you, and calculate your first AI visibility baseline.</p>
          <p>For the new free audit flow, start at /audit to run live ChatGPT and Gemini visibility tests before saving a workspace.</p>
          <Button className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
            Create baseline workspace
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  helper,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={name}>
        {label}
      </label>
      <Input id={name} name={name} defaultValue={defaultValue} required />
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  helper,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor={name}>
          {label}
        </label>
        <Textarea id={name} name={name} defaultValue={defaultValue} required rows={5} />
        {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
      </div>
    </div>
  );
}
