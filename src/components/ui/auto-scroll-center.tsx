"use client";

import { useEffect } from "react";

/**
 * AutoScrollCenterProvider
 * Tự động căn chỉnh mượt mà (smooth center) phần tử tương tác (button, card, input...)
 * vào giữa màn hình khi người dùng bấm/chạm, giúp tăng trải nghiệm sử dụng trên cả mobile và desktop.
 *
 * Tối ưu hiệu năng:
 * - Sử dụng passive event listener, không chặn luồng chính (0ms overhead).
 * - Sử dụng requestAnimationFrame để hạn chế layout thrashing.
 * - Kiểm tra vùng an toàn (comfort zone): Nếu phần tử đã nằm gần tâm màn hình thì không cuộn để tránh giật.
 * - Bỏ qua các phần tử có data-no-auto-center hoặc thuộc fixed headers/navigation.
 */
export function AutoScrollCenter() {
    useEffect(() => {
        let frameId: number | null = null;
        let lastTarget: Element | null = null;
        let lastScrollTime = 0;

        function handleInteraction(event: Event) {
            const now = performance.now();
            // Debounce nhẹ giữa các lần click liên tiếp (120ms)
            if (now - lastScrollTime < 120) return;

            const eventTarget = event.target as Element | null;
            if (!eventTarget || typeof eventTarget.closest !== "function") return;

            // Tìm phần tử tương tác gần nhất
            const interactiveEl = eventTarget.closest(
                'button, a, [role="button"], input, select, textarea, [data-auto-center], summary',
            );

            if (!interactiveEl) return;

            // Bỏ qua nếu có chỉ định không cuộn hoặc phần tử cố định/ghim
            if (interactiveEl.closest("[data-no-auto-center]")) return;
            if (interactiveEl.getAttribute("data-no-auto-center") === "true") return;

            // Bỏ qua các nút đóng modal hoặc dropdown nội bộ nếu nằm trong dialog cố định
            const isModalClose = interactiveEl.getAttribute("aria-label")?.toLowerCase().includes("đóng") ||
                interactiveEl.classList.contains("modal-close-btn");
            if (isModalClose) return;

            // Bỏ qua nếu là click trên thanh điều hướng ghim đầu trang/chân trang cố định
            const isStickyOrFixed = window.getComputedStyle(interactiveEl).position === "fixed";
            if (isStickyOrFixed) return;

            // Tránh lặp lại cuộn cùng 1 phần tử trong thời gian ngắn
            if (lastTarget === interactiveEl && now - lastScrollTime < 600) return;

            // Tính toán vị trí xem có cần cuộn không
            const rect = interactiveEl.getBoundingClientRect();
            // Nếu phần tử đang ẩn (display: none / 0 kích thước) thì bỏ qua
            if (rect.width === 0 || rect.height === 0) return;

            const viewportHeight = window.innerHeight;
            const elementCenter = rect.top + rect.height / 2;
            const viewportCenter = viewportHeight / 2;

            // Comfort zone: nếu phần tử đã nằm trong khoảng 32% - 68% chiều cao màn hình thì giữ nguyên
            const distanceRatio = Math.abs(elementCenter - viewportCenter) / viewportHeight;
            if (distanceRatio < 0.18) return;

            lastTarget = interactiveEl;
            lastScrollTime = now;

            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }

            frameId = requestAnimationFrame(() => {
                try {
                    interactiveEl.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                    });
                } catch {
                    // Fallback an toàn cho các trình duyệt cũ
                    interactiveEl.scrollIntoView(false);
                }
            });
        }

        // Lắng nghe click với { passive: true } để không ảnh hưởng đến tốc độ phản hồi touch/click
        document.addEventListener("click", handleInteraction, { passive: true });

        return () => {
            document.removeEventListener("click", handleInteraction);
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }
        };
    }, []);

    return null;
}
