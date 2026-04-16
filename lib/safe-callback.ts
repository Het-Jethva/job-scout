export function getSafeCallbackPath(
  callbackUrl: string | null | undefined,
  fallback: string = "/dashboard"
): string {
  if (!callbackUrl) {
    return fallback
  }

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback
  }

  return callbackUrl
}
