const removeTrailingSlash = (value: string) => value.replace(/\/$/, "");

const toOptionalString = (value: string | undefined | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const inferFromVercel = () => {
  const vercelUrl = toOptionalString(process.env.VERCEL_URL);
  if (!vercelUrl) {
    return undefined;
  }
  return vercelUrl.includes("http") ? vercelUrl : `https://${vercelUrl}`;
};

let cachedCanonicalBaseUrl: string | null = null;

export function getCanonicalBaseUrl(): string {
  if (cachedCanonicalBaseUrl) {
    return cachedCanonicalBaseUrl;
  }

  const configuredNextAuthUrl = toOptionalString(process.env.NEXTAUTH_URL);
  const configuredPublicAppUrl = toOptionalString(process.env.NEXT_PUBLIC_APP_URL);

  const baseUrl = configuredNextAuthUrl ?? configuredPublicAppUrl ?? inferFromVercel() ?? "http://localhost:3000";

  cachedCanonicalBaseUrl = removeTrailingSlash(baseUrl);
  return cachedCanonicalBaseUrl;
}

export function resolveRequestBaseUrl(request?: Request | { headers: Headers }): string {
  const headers = request?.headers;
  if (headers) {
    const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
    if (forwardedHost) {
      const forwardedProto = headers.get("x-forwarded-proto");
      const protocol = forwardedProto
        ?? (forwardedHost.includes("localhost") || forwardedHost.startsWith("127.") ? "http" : "https");
      return removeTrailingSlash(`${protocol}://${forwardedHost}`);
    }
    const origin = headers.get("origin");
    if (origin) {
      return removeTrailingSlash(origin);
    }
  }

  return getCanonicalBaseUrl();
}
