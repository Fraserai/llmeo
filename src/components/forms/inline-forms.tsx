import { addCompetitorAction, addCustomPromptAction, updateBusinessSettingsAction } from "@/server/actions/workspace-actions";
import { serialiseLines } from "@/server/services/prompt-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AddPromptForm({
  categories,
}: {
  categories: {
    id: string;
    name: string;
  }[];
}) {
  return (
    <form action={addCustomPromptAction} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[180px_minmax(0,1fr)_140px]">
      <select
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
        name="categoryId"
        defaultValue={categories[0]?.id}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <Input name="text" placeholder="Add a custom prompt your customers might ask AI..." required />
      <Button className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800">Add prompt</Button>
    </form>
  );
}

export function AddCompetitorForm() {
  return (
    <form action={addCompetitorAction} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 md:flex-row">
      <Input name="name" placeholder="Add a competitor business name" required />
      <Button className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800">Add competitor</Button>
    </form>
  );
}

export function SettingsForm({
  business,
  competitors,
}: {
  business: {
    name: string;
    websiteDomain: string;
    industry: string;
    category: string;
    description: string;
    australianStates: string[];
    targetLocations: string[];
    productsServices: string[];
    customerKeywords: string[];
  };
  competitors: string[];
}) {
  return (
    <form action={updateBusinessSettingsAction} className="grid gap-5 md:grid-cols-2">
      <Field label="Business name" name="businessName" defaultValue={business.name} />
      <Field label="Website domain" name="websiteDomain" defaultValue={business.websiteDomain} />
      <Field label="Industry" name="industry" defaultValue={business.industry} />
      <Field label="Category" name="category" defaultValue={business.category} />
      <Field label="States covered" name="states" defaultValue={serialiseLines(business.australianStates)} />
      <TextField className="md:col-span-2" label="Business description" name="description" defaultValue={business.description} />
      <TextField label="Target locations" name="locations" defaultValue={serialiseLines(business.targetLocations)} />
      <TextField label="Products and services" name="productsServices" defaultValue={serialiseLines(business.productsServices)} />
      <TextField label="Competitors" name="competitors" defaultValue={serialiseLines(competitors)} />
      <TextField label="Target customer keywords" name="customerKeywords" defaultValue={serialiseLines(business.customerKeywords)} />
      <div className="md:col-span-2">
        <Button className="h-11 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">Save settings</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={name}>
        {label}
      </label>
      <Input id={name} name={name} defaultValue={defaultValue} required />
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor={name}>
          {label}
        </label>
        <Textarea id={name} name={name} defaultValue={defaultValue} rows={5} required />
      </div>
    </div>
  );
}
