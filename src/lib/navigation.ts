/** Only allow redirects to a path within this application. */
export function safeRedirectPath(value: string, fallback = "/dashboard"): string {
    if (!value.startsWith("/")) return fallback;
    try {
        const base = "https://app.local";
        const url = new URL(value, base);
        return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
    } catch {
        return fallback;
    }
}
