/**
 * @deprecated Import from `@/lib/google-business/service` instead.
 * Thin re-exports kept for existing imports.
 */
export {
  GoogleBusinessProfileService,
  type GbpAccount,
  type GbpLocation,
  type CreateLocalPostInput,
  type CreateLocalPostResult,
} from "@/lib/google-business/service";

import { GoogleBusinessProfileService } from "@/lib/google-business/service";
import type {
  CreateLocalPostInput,
  CreateLocalPostResult,
  GbpLocation,
} from "@/lib/google-business/service";
import type {
  GoogleBusinessOAuthConfig,
  GoogleBusinessRuntimeConfig,
} from "@/lib/google-business/config";

export async function listGoogleBusinessAccounts(
  config: GoogleBusinessOAuthConfig,
) {
  return GoogleBusinessProfileService.listAccounts(config);
}

export async function listGoogleBusinessLocations(
  config: GoogleBusinessOAuthConfig,
  accountId: string,
): Promise<GbpLocation[]> {
  return GoogleBusinessProfileService.listLocations(config, accountId);
}

export async function createGoogleBusinessLocalPost(
  config: GoogleBusinessRuntimeConfig,
  input: CreateLocalPostInput,
): Promise<CreateLocalPostResult> {
  return GoogleBusinessProfileService.createPost(config, input);
}

export async function withGoogleBusinessAccess<T>(
  config: GoogleBusinessOAuthConfig,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const token = await GoogleBusinessProfileService.refreshAccessToken(config);
  return fn(token);
}
