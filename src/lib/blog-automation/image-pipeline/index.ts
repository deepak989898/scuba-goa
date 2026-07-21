export * from "./types";
export { classifyVisualCategory, lightingForTime } from "./classify-visual";
export { buildImageBrief, pickCompositionVariant, describeComposition } from "./composition-engine";
export {
  buildImagePromptFromBrief,
  buildImageAltFromBrief,
  buildImageTitleFromBrief,
  buildImageCaptionFromBrief,
} from "./build-prompt";
export {
  sha256Hex,
  promptHash,
  averageHash,
  differenceHash,
  hammingHex,
  similarityFromHamming,
} from "./hash";
export {
  checkImageDuplicate,
  listRecentImageRegistry,
  saveImageRegistryEntry,
} from "./dedupe";
export { validateImageBriefRelevance, categorySuggestsWrongTopic } from "./validate";
export { generateFeaturedImageForArticle } from "./generate-featured";
