// https://stackoverflow.com/a/62969380 + fix to remove empty entries (.filter(entry => entry)) + fix to map nested objects well
export function buildQueryString(query: Record<string, unknown>): string {
  const build = (obj: Record<string, unknown>, prefix?: string): string[] => {
    return Object.entries(obj).flatMap(([key, value]) => {
      const paramKey = prefix ? `${prefix}[${key}]` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        return build(value as Record<string, unknown>, paramKey);
      }

      return value !== undefined && value !== null ? `${paramKey}=${value}` : [];
    });
  };

  return build(query).join("&");
}
export function basicAuthHeader(
  client_id: string,
  client_secret: string | undefined,
) {
  return `Basic ${btoa(`${client_id}:${client_secret}`)}`;
}
