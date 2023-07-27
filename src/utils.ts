// https://stackoverflow.com/a/62969380
export function buildQueryString(query: Record<string, any>): string {
  return Object.entries(query)
    .map(([key, value]) =>
      key && value
        ? `${key}=${value}`
        : ""
    )
    .filter(entry => entry)
    .join("&");
}

export function basicAuthHeader(client_id: string, client_secret: string | undefined) {
  return `Basic ${btoa(`${client_id}:${client_secret}`)}`;
}
