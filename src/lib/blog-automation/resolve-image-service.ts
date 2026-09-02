import {
  inferServiceSlugFromTitle,
  resolveEffectiveServiceSlug,
} from "@/lib/blog-automation/blog-image-topic";
import { getServiceBySlugServer } from "@/lib/get-services-server";

/** Resolve service slug + display name for image generation (title overrides wrong slug). */
export async function resolveImageServiceContext(
  title: string,
  serviceSlug = "",
): Promise<{ serviceSlug: string; serviceName: string }> {
  const effectiveSlug = resolveEffectiveServiceSlug(title, serviceSlug);
  const service = await getServiceBySlugServer(effectiveSlug);
  if (service) {
    return { serviceSlug: service.slug, serviceName: service.title };
  }
  const fromTitle = inferServiceSlugFromTitle(title);
  if (fromTitle) {
    const alt = await getServiceBySlugServer(fromTitle);
    if (alt) return { serviceSlug: alt.slug, serviceName: alt.title };
  }
  return {
    serviceSlug: effectiveSlug,
    serviceName: effectiveSlug.replace(/-/g, " "),
  };
}
