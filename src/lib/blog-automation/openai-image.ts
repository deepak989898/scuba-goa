/**
 * Generate a blog featured photo via OpenAI Images API from the post title.
 * Returns raw image bytes (PNG/JPEG/WebP) — caller applies brand bar + WebP upload.
 */

export function buildBlogImagePrompt(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim().slice(0, 200);
  return [
    `Create a realistic editorial travel photograph for an article titled "${clean}".`,
    "Show a properly equipped scuba diver exploring clear tropical water with visible coral and small reef fish where relevant,",
    "natural sunlight rays underwater, realistic diving gear and body proportions, authentic Indian coastal / Arabian Sea atmosphere,",
    "wide landscape 16:9 composition, premium travel photography.",
    "No text, no titles, no large logo, no watermark, no UI, no distorted anatomy, no extra limbs,",
    "no fantasy creatures, no fake monuments, no unsafe diving behaviour, no surface-only parasailing unless the title is about that activity.",
  ].join(" ");
}

function isGptImageModel(model: string): boolean {
  return model.startsWith("gpt-image");
}

/**
 * Calls OpenAI `/v1/images/generations` and returns image bytes.
 * Default model: `gpt-image-1` (override with `OPENAI_IMAGE_MODEL`).
 */
export async function generateBlogImageBufferFromTitle(
  title: string,
): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!trimmed) throw new Error("Blog title is required to generate an image");

  const model =
    process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const quality =
    process.env.OPENAI_IMAGE_QUALITY?.trim() ||
    (isGptImageModel(model) ? "medium" : "standard");

  const prompt = buildBlogImagePrompt(trimmed);

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
  };

  if (isGptImageModel(model)) {
    // Landscape-ish for blog heroes; gpt-image models always return b64_json.
    body.size = "1536x1024";
    body.quality = quality;
  } else {
    // dall-e-3 and similar
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
    return Buffer.from(item.b64_json, "base64");
  }

  if (item.url) {
    const imgRes = await fetch(item.url, {
      headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
    });
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image: ${imgRes.status}`);
    }
    return Buffer.from(await imgRes.arrayBuffer());
  }

  throw new Error("OpenAI image response missing b64_json and url");
}
