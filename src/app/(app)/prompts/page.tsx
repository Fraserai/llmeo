import { requireWorkspaceContext } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";
import { AddPromptForm } from "@/components/forms/inline-forms";
import { HeaderActionButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generatePromptSetAction, togglePromptStatusAction } from "@/server/actions/workspace-actions";

export default async function PromptsPage() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    return null;
  }

  const [prompts, categories, runs] = await Promise.all([
    prisma.prompt.findMany({
      where: { businessId: business.id },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.promptCategory.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.promptRun.findMany({
      where: { businessId: business.id },
      include: {
        prompt: true,
      },
    }),
  ]);

  const groupedPrompts = Object.values(
    prompts.reduce<Record<string, { name: string; prompts: typeof prompts }>>((acc, prompt) => {
      if (!acc[prompt.category.slug]) {
        acc[prompt.category.slug] = { name: prompt.category.name, prompts: [] };
      }

      acc[prompt.category.slug].prompts.push(prompt);
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Prompts"
        title="Prompt management"
        description="Generated prompt sets are grouped by category intent. You can add custom prompts, pause underperforming prompts, and regenerate the set as the business evolves."
        action={
          <form action={generatePromptSetAction}>
            <HeaderActionButton type="submit">Generate more prompts</HeaderActionButton>
          </form>
        }
      />

      <AddPromptForm categories={categories.map((category) => ({ id: category.id, name: category.name }))} />

      <div className="space-y-5">
        {groupedPrompts.map((group) => (
          <Card key={group.name} className="border-white/70 bg-white/90">
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.prompts.map((prompt) => {
                    const promptRuns = runs.filter((run) => run.promptId === prompt.id);
                    return (
                      <TableRow key={prompt.id}>
                        <TableCell className="max-w-[520px] whitespace-normal font-medium text-slate-900">
                          {prompt.text}
                        </TableCell>
                        <TableCell>
                          <Badge variant={prompt.source === "CUSTOM" ? "secondary" : "outline"}>
                            {prompt.source.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={prompt.status === "ACTIVE" ? "default" : "secondary"}>
                            {prompt.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{promptRuns.length} engine runs</TableCell>
                        <TableCell className="text-right">
                          <form action={togglePromptStatusAction}>
                            <input type="hidden" name="promptId" value={prompt.id} />
                            <input type="hidden" name="nextStatus" value={prompt.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                            <button className="text-sm font-medium text-slate-950 underline-offset-4 hover:underline" type="submit">
                              {prompt.status === "ACTIVE" ? "Pause" : "Activate"}
                            </button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
