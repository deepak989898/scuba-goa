import { SITE_URL } from "@/lib/constants";
import type { BlogLanguage } from "@/lib/blog-firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { createGoogleBusinessLocalPost } from "@/lib/google-business/client";
import {
  getGoogleBusinessRuntimeConfig,
  isGoogleBusinessPostingEnabled,
} from "@/lib/google-business/config";
import {
  getGoogleBusinessSettings,
  saveGoogleBusinessSettings,
} from "@/lib/google-business/settings";

function languageCodeForBlog(lang?: BlogLanguage): string {
  if (lang === "hi") return "hi-IN";
  if (lang === "hinglish") return "en-IN";
  return "en-IN";
}

function buildPostSummary(title: string, excerpt: string): string {
  const t = title.trim();
  const e = excerpt.trim().replace(/\s+/g, " ");
  const combined = e ? `${t}\n\n${e}` : t;
  if (combined.length <= 1500) return combined;
  return `${combined.slice(0, 1497)}…`;
}

export type PostBlogToGbpInput = {
  slug: string;
  title: string;
  excerpt: string;
  featuredImageUrl?: string;
  language?: BlogLanguage;
  /** Skip if blog doc already has googleBusinessPostName. Default true. */
  skipIfAlreadyPosted?: boolean;
};

export type PostBlogToGbpResult =
  | { ok: true; posted: true; postName: string }
  | { ok: true; posted: false; reason: string }
  | { ok: false; error: string };

/** Publish blog as a Google Business Profile update (when enabled & configured). */
export async function postBlogToGoogleBusinessProfile(
  input: PostBlogToGbpInput,
): Promise<PostBlogToGbpResult> {
  const settings = await getGoogleBusinessSettings();
  const runtime = await getGoogleBusinessRuntimeConfig();

  if (!isGoogleBusinessPostingEnabled(settings, runtime)) {
    return { ok: true, posted: false, reason: "Google Business posting disabled" };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, error: "Firebase Admin not configured" };
  }

  const slug = input.slug.trim();
  const postRef = db.collection("blogPosts").doc(slug);
  const existing = await postRef.get();
  const existingData = existing.data() as Record<string, unknown> | undefined;

  if (
    input.skipIfAlreadyPosted !== false &&
    String(existingData?.googleBusinessPostName ?? "").trim()
  ) {
    return { ok: true, posted: false, reason: "Already posted to Google Business" };
  }

  const blogUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${slug}`;
  const summary = buildPostSummary(input.title, input.excerpt);

  try {
    const result = await createGoogleBusinessLocalPost(runtime!, {
      summary,
      languageCode: languageCodeForBlog(input.language),
      callToActionUrl: blogUrl,
      imageUrl: input.featuredImageUrl?.trim(),
    });

    const now = new Date().toISOString();
    await postRef.set(
      {
        googleBusinessPostName: result.name,
        googleBusinessPostedAt: now,
      },
      { merge: true },
    );

    await saveGoogleBusinessSettings({
      lastPostAt: now,
      lastPostSlug: slug,
      lastPostError: null,
    });

    return { ok: true, posted: true, postName: result.name };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Business post failed";
    await saveGoogleBusinessSettings({ lastPostError: message });
    return { ok: false, error: message };
  }
}
