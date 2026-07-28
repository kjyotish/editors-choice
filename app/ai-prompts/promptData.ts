export type AiPromptItem = {
  id: string;
  title: string;
  prompt_type: "image_generation" | "color_grade_image" | "image_to_video";
  prompt_text: string;
  before_image_url: string | null;
  after_image_url: string | null;
  published: boolean;
  sort_order: number | null;
  created_at: string;
};

export const fallbackPrompts: AiPromptItem[] = [
  {
    id: "starter-image-generation",
    title: "Cinematic Image Generation",
    prompt_type: "image_generation",
    prompt_text:
      "Create a cinematic editorial portrait with soft rim light, shallow depth of field, dramatic shadows, rich texture, and a premium color palette. Keep the subject sharp, the background moody, and the overall frame ready for a viral thumbnail.",
    before_image_url: null,
    after_image_url: null,
    published: true,
    sort_order: 1,
    created_at: "",
  },
  {
    id: "starter-color-grade",
    title: "Moody Color Grade",
    prompt_type: "color_grade_image",
    prompt_text:
      "Apply a moody teal-orange color grade with clean contrast, soft highlights, deep blacks, muted skin tones, and a polished commercial finish. Preserve detail while adding a premium cinematic atmosphere.",
    before_image_url: null,
    after_image_url: null,
    published: true,
    sort_order: 2,
    created_at: "",
  },
  {
    id: "starter-image-to-video",
    title: "Image to Video Motion",
    prompt_type: "image_to_video",
    prompt_text:
      "Animate this still image into a smooth cinematic clip with gentle camera push-in, natural subject motion, soft parallax depth, realistic lighting shifts, and clean transitions that feel viral on short-form video platforms.",
    before_image_url: null,
    after_image_url: null,
    published: true,
    sort_order: 3,
    created_at: "",
  },
];

export function resolvePromptById(items: AiPromptItem[], id: string) {
  return items.find((item) => item.id === id) ?? fallbackPrompts.find((item) => item.id === id) ?? null;
}
