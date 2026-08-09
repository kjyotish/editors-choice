export type AiPromptType = "image_generation" | "color_grade_image" | "image_to_video";

export type AiPromptLike = {
  id: string;
  prompt_type: AiPromptType;
  sort_order: number | null;
  created_at: string;
};

export type AiPromptSubcategoryLike = {
  subcategory?: string | null;
};

type PromptCategory = {
  key: AiPromptType;
  label: string;
  description: string;
};

export const promptCategories: PromptCategory[] = [
  {
    key: "color_grade_image",
    label: "Cinematic Colour Grade",
    description: "Before/after grading references and mood shifts.",
  },
  {
    key: "image_generation",
    label: "Image Generate",
    description: "Prompt ideas for creating cinematic still images.",
  },
  {
    key: "image_to_video",
    label: "Image to Video",
    description: "Motion prompts that turn stills into short clips.",
  },
];

const categoryOrder = new Map(promptCategories.map((category, index) => [category.key, index]));

export const getPromptCategoryLabel = (type: AiPromptType) =>
  promptCategories.find((category) => category.key === type)?.label ?? type;

export function sortPromptsByCategory<T extends AiPromptLike>(items: T[]) {
  return [...items].sort((left, right) => {
    const categoryDelta = (categoryOrder.get(left.prompt_type) ?? 0) - (categoryOrder.get(right.prompt_type) ?? 0);
    if (categoryDelta !== 0) return categoryDelta;

    const leftSort = left.sort_order ?? Number.POSITIVE_INFINITY;
    const rightSort = right.sort_order ?? Number.POSITIVE_INFINITY;
    if (leftSort !== rightSort) return leftSort - rightSort;

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export function groupPromptsByCategory<T extends AiPromptLike>(items: T[]) {
  const grouped = promptCategories.reduce((acc, category) => {
    acc[category.key] = [];
    return acc;
  }, {} as Record<AiPromptType, T[]>);

  sortPromptsByCategory(items).forEach((item) => {
    grouped[item.prompt_type].push(item);
  });

  return grouped;
}

export function normalizePromptSubcategory(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function collectPromptSubcategories<T extends AiPromptSubcategoryLike>(items: T[]) {
  const map = new Map<string, string>();

  for (const item of items) {
    const label = item.subcategory?.trim();
    if (!label) continue;

    const normalized = normalizePromptSubcategory(label);
    if (!map.has(normalized)) {
      map.set(normalized, label);
    }
  }

  return Array.from(map.values()).sort((left, right) => left.localeCompare(right));
}
