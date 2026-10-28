"use client";

export function CatalogLoadError({ onRetry, isRetrying }: {
    onRetry: () => void;
    isRetrying: boolean;
}) {
    return (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-900">
            <p>Chưa tải được danh mục. Kiểm tra kết nối mạng rồi thử lại.</p>
            <button type="button" disabled={isRetrying} aria-busy={isRetrying} onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-rose-300 bg-white px-4 font-semibold disabled:opacity-60">
                {isRetrying ? "Đang tải lại…" : "Tải lại danh mục"}
            </button>
        </div>
    );
}
