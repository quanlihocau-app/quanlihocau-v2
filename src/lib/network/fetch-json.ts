/** Read-only requests: bound both response headers and JSON body parsing. */
export async function fetchJson(
    url: string,
    signal?: AbortSignal,
    timeoutMs = 10_000,
): Promise<unknown> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Không thể tải dữ liệu. Vui lòng thử lại.");
        return await response.json();
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
    }
}
