// https://stackoverflow.com/a/62969380 + fix to remove empty entries (.filter(entry => entry))
export function buildQueryString(query: Record<string, unknown>): string {
  return Object.entries(query)
    .map(([key, value]) => (key && value ? `${key}=${value}` : ""))
    .filter((entry) => entry)
    .join("&");
}

export function basicAuthHeader(
  client_id: string,
  client_secret: string | undefined,
) {
  return `Basic ${btoa(`${client_id}:${client_secret}`)}`;
}
