import { z } from "zod";

export const OVERVIEW_SECTION_IDS = [
  "ask-ai",
  "do-list",
  "kpis",
  "upcoming",
  "goals",
  "actions",
  "notes",
] as const;

export type OverviewSectionId = (typeof OVERVIEW_SECTION_IDS)[number];

export type OverviewSectionConfig = {
  id: OverviewSectionId;
  visible: boolean;
};

export type OverviewLayout = {
  sections: OverviewSectionConfig[];
};

export const DEFAULT_OVERVIEW_LAYOUT: OverviewLayout = {
  sections: [
    { id: "ask-ai", visible: true },
    { id: "do-list", visible: true },
    { id: "kpis", visible: true },
    { id: "upcoming", visible: true },
    { id: "goals", visible: true },
    { id: "actions", visible: true },
    { id: "notes", visible: true },
  ],
};

const sectionSchema = z.object({
  id: z.enum(OVERVIEW_SECTION_IDS),
  visible: z.boolean(),
});

export const overviewLayoutSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(20),
});

export function normalizeOverviewLayout(input: unknown): OverviewLayout {
  const parsed = overviewLayoutSchema.safeParse(input);
  const ordered: OverviewSectionConfig[] = [];
  const seen = new Set<OverviewSectionId>();

  if (parsed.success) {
    for (const section of parsed.data.sections) {
      if (seen.has(section.id)) continue;
      seen.add(section.id);
      ordered.push(section);
    }
  }

  for (const fallback of DEFAULT_OVERVIEW_LAYOUT.sections) {
    if (!seen.has(fallback.id)) {
      ordered.push(fallback);
      seen.add(fallback.id);
    }
  }

  return { sections: ordered };
}
