import type { Job, Sow } from "../types";

export interface JobSowSection {
  key: "objectives" | "scopeOfWork" | "deliverables" | "assumptions" | "outOfScope";
  title: string;
  items: string[];
}

export interface JobSowDisplay {
  title?: string;
  overview?: string;
  sections: JobSowSection[];
  plainText?: string;
}

export interface EditableJobSow {
  title?: string;
  overview?: string;
  objectives?: string[];
  scopeOfWork?: string[];
  deliverables?: string[];
  assumptions?: string[];
  outOfScope?: string[];
}

type JobSowSource = Partial<Pick<Job, "sow" | "structuredSow" | "rawRequirements">>;
type UnknownRecord = Record<string, unknown>;

const SECTION_DEFINITIONS = [
  ["objectives", "Mục tiêu"],
  ["scopeOfWork", "Phạm vi công việc"],
  ["deliverables", "Sản phẩm bàn giao"],
  ["assumptions", "Giả định"],
  ["outOfScope", "Ngoài phạm vi"],
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned || undefined;
}

function cleanListItem(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const cleaned = String(value)
    .trim()
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "");
  return cleaned || undefined;
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(cleanListItem).filter((item): item is string => Boolean(item));
  }

  const text = cleanText(value);
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) return toList(parsed);
    } catch {
      // A normal text value can also begin with "["; keep it as readable text.
    }
  }

  return text
    .split(/\r?\n/)
    .map(cleanListItem)
    .filter((item): item is string => Boolean(item));
}

function normalizeStructuredSow(value: Sow | UnknownRecord): JobSowDisplay | null {
  const record = value as UnknownRecord;
  const overview = cleanText(record.overview);
  const sections = SECTION_DEFINITIONS.map(([key, title]) => {
    const sourceValue =
      key === "deliverables"
        ? record.deliverables ?? record.deliverable
        : record[key];
    return { key, title, items: toList(sourceValue) };
  }).filter((section) => section.items.length > 0);

  if (!overview && sections.length === 0) return null;

  return {
    title: cleanText(record.title),
    overview,
    sections,
  };
}

function parseLegacyStructuredSow(value?: string): {
  display: JobSowDisplay | null;
  wasJson: boolean;
} {
  const text = cleanText(value);
  if (!text) return { display: null, wasJson: false };

  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "string") {
      return {
        display: { sections: [], plainText: cleanText(parsed) },
        wasJson: true,
      };
    }
    if (!isRecord(parsed)) return { display: null, wasJson: true };

    const candidate = isRecord(parsed.sow) ? parsed.sow : parsed;
    return {
      display: normalizeStructuredSow(candidate),
      wasJson: true,
    };
  } catch {
    return {
      display: { sections: [], plainText: text },
      wasJson: false,
    };
  }
}

export function resolveJobSow(job: JobSowSource): JobSowDisplay {
  if (job.sow) {
    const normalized = normalizeStructuredSow(job.sow);
    if (normalized) return normalized;
  }

  const legacy = parseLegacyStructuredSow(job.structuredSow);
  if (legacy.display) return legacy.display;

  const fallback = cleanText(job.rawRequirements);
  if (fallback) return { sections: [], plainText: fallback };

  // Never expose an unrecognized serialized JSON object as UI text.
  return { sections: [] };
}

export function getJobSowSummary(job: JobSowSource): string {
  const display = resolveJobSow(job);
  if (display.plainText) return display.plainText.replace(/\s+/g, " ").trim();

  return [
    display.overview,
    ...display.sections.flatMap((section) => section.items),
  ]
    .filter((item): item is string => Boolean(item))
    .join(" ");
}

export function formatJobSowText(job: JobSowSource): string {
  const display = resolveJobSow(job);
  if (display.plainText) return display.plainText;

  return [
    display.overview ? `Tổng quan: ${display.overview}` : "",
    ...display.sections.map(
      (section) =>
        `${section.title}:\n${section.items.map((item) => `- ${item}`).join("\n")}`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function getEditableJobSow(job: JobSowSource): EditableJobSow | undefined {
  const display = resolveJobSow(job);
  if (display.plainText || (!display.overview && display.sections.length === 0)) {
    return undefined;
  }

  const itemsFor = (key: JobSowSection["key"]) =>
    display.sections.find((section) => section.key === key)?.items || [];

  return {
    title: display.title,
    overview: display.overview,
    objectives: itemsFor("objectives"),
    scopeOfWork: itemsFor("scopeOfWork"),
    deliverables: itemsFor("deliverables"),
    assumptions: itemsFor("assumptions"),
    outOfScope: itemsFor("outOfScope"),
  };
}
