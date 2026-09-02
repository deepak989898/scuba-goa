/**
 * OpenAI Images API — prompt is supplied by the image pipeline (topic-specific).
 */

import { buildImagePromptFromBrief } from "./image-pipeline/build-prompt";
import { buildImageBrief } from "./image-pipeline/composition-engine";
import { classifyVisualCategory } from "./image-pipeline/classify-visual";
import type { ImageBrief } from "./image-pipeline/types";

/** @deprecated Prefer generateBlogImageBufferFromBrief — kept for compatibility. */
export function buildBlogImagePrompt(title: string): string {
  const classification = classifyVisualCategory({ title });
  const brief = buildImageBrief({
    articleTitle: title,
    primaryKeyword: title,
    serviceName: "Goa adventures",
    serviceSlug: "",
    classification,
    attempt: 1,
  });
  return buildImagePromptFromBrief(brief);
}

function isGptImageModel(model: string): boolean {
  return model.startsWith("gpt-image");
}

export function getConfiguredImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

export async function generateBlogImageBufferFromPrompt(
  prompt: string,
): Promise<{ buffer: Buffer; model: string; prompt: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const trimmed = prompt.replace(/\s+/g, " ").trim();
  if (!trimmed) throw new Error("Image prompt is required");

  const model = getConfiguredImageModel();
  // medium ≈ ~40% cheaper than high; override via OPENAI_IMAGE_QUALITY=high if needed.
  const quality =
    process.env.OPENAI_IMAGE_QUALITY?.trim() ||
    (isGptImageModel(model) ? "medium" : "standard");

  const body: Record<string, unknown> = {
    model,
    prompt: trimmed.slice(0, 32000),
    n: 1,
  };

  if (isGptImageModel(model)) {
    // Landscape native size reduces square crop issues; pipeline preserves full frame on upload.
    body.size = process.env.OPENAI_IMAGE_SIZE?.trim() || "1536x1024";
    body.quality = quality;
  } else {
    body.size = "1792x1024";
    body.quality = quality === "medium" ? "standard" : quality;
    body.response_format = "b64_json";
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  if (!res.ok) {
    throw new Error(data?.error?.message ?? "OpenAI image generation failed");
  }

  const item = data?.data?.[0];
  if (!item) throw new Error("OpenAI returned no image data");

  if (item.b64_json) {
    return { buffer: Buffer.from(item.b64_json, "base64"), model, prompt: trimmed };
  }

  if (item.url) {
    const imgRes = await fetch(item.url, {
      headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
    });
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image: ${imgRes.status}`);
    }
    return {
      buffer: Buffer.from(await imgRes.arrayBuffer()),
      model,
      prompt: trimmed,
    };
  }

  throw new Error("OpenAI image response missing b64_json and url");
}

export async function generateBlogImageBufferFromBrief(
  brief: ImageBrief,
): Promise<{ buffer: Buffer; model: string; prompt: string }> {
  const prompt = buildImagePromptFromBrief(brief);
  return generateBlogImageBufferFromPrompt(prompt);
}

/**
 * Legacy entry — still classifies from title (no longer hardcodes scuba diver).
 */
export async function generateBlogImageBufferFromTitle(
  title: string,
): Promise<Buffer> {
  const classification = classifyVisualCategory({ title });
  const brief = buildImageBrief({
    articleTitle: title,
    primaryKeyword: title,
    serviceName: "Goa adventures",
    serviceSlug: "",
    classification,
    attempt: 1,
  });
  const { buffer } = await generateBlogImageBufferFromBrief(brief);
  return buffer;
}
