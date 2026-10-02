"use client";

import { useEffect } from "react";

/**
 * AutoScrollCenterProvider
 * Tự động căn chỉnh mượt mà phần tử tương tác (button, card, input...)
 * vào vùng nhìn thấy được khi người dùng bấm/chạm.
 *
 * Đặc biệt quan trọng trên mobile: đảm bảo input không bị che bởi:
 * - Tabbar cố định phía dưới (height ~64px + safe-area)
 * - Bàn phím ảo khi mở (iOS/Android)
 *
 * Tối ưu hiệu năng:
 * - Sử dụng passive event listener, không chặn luồng chính.
 * - Sử dụng requestAnimationFrame để hạn chế layout thrashing.
 * - Kiểm tra vùng an toàn: không cuộn nếu element đã trong vùng OK.
 * - Bỏ qua fixed headers/navigation.
 */
export function AutoScrollCenter() {
    useEffect(() => {
        let frameId: number | null = null;
        let lastTarget: Element | null = null;
        let lastScrollTime = 0;

        // Chiều cao tabbar cố định + safe-area ước tính
        const TAB_BAR_HEIGHT = 72;
        // Khoảng padding tối thiểu phía trên (tránh bị header che)
        const TOP_MARGIN = 80;

        function handleInteraction(event: Event) {
            const now = performance.now();
            // Debounce nhẹ giữa các lần click liên tiếp (100ms)
            if (now - lastScrollTime < 100) return;

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
            const isModalClose =
                interactiveEl.getAttribute("aria-label")?.toLowerCase().includes("đóng") ||
                interactiveEl.classList.contains("modal-close-btn");
            if (isModalClose) return;

            // Bỏ qua nếu là phần tử cố định (tabbar, header)
            const computedStyle = window.getComputedStyle(interactiveEl);
            if (computedStyle.position === "fixed") return;

            // Kiểm tra thêm: parent gần nhất có position: fixed không
            const closestFixed = interactiveEl.closest(
                'nav[class*="fixed"], header[class*="sticky"], [class*="mobile-pos-nav"], [class*="fixed bottom"]'
            );
            if (closestFixed) return;

            // Tránh lặp lại cuộn cùng 1 phần tử trong thời gian ngắn
            if (lastTarget === interactiveEl && now - lastScrollTime < 500) return;

            const rect = interactiveEl.getBoundingClientRect();
            // Nếu phần tử đang ẩn (display: none / 0 kích thước) thì bỏ qua
            if (rect.width === 0 || rect.height === 0) return;

            const viewportHeight = window.innerHeight;
            // Vùng hiển thị an toàn (trừ tabbar phía dưới)
            const safeBottom = viewportHeight - TAB_BAR_HEIGHT;

            const elementTop = rect.top;
            const elementBottom = rect.bottom;

            // Kiểm tra xem element có đang trong vùng an toàn không
            const isFullyVisible =
                elementTop >= TOP_MARGIN && elementBottom <= safeBottom;

            if (isFullyVisible) return;

            lastTarget = interactiveEl;
            lastScrollTime = now;

            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }

            frameId = requestAnimationFrame(() => {
                try {
                    // Cho input/textarea/select: scroll để hiện phần trên (gần label)
                    const isFormEl =
                        interactiveEl.tagName === "INPUT" ||
                        interactiveEl.tagName === "TEXTAREA" ||
                        interactiveEl.tagName === "SELECT";

                    if (isFormEl) {
                        // Scroll để element vào vùng nhìn thấy phía trên (tránh tabbar và bàn phím)
                        interactiveEl.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "nearest",
                        });
                    } else {
                        // Với button/card: scroll để nhìn thấy, block nearest để ít giật nhất
                        interactiveEl.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                            inline: "nearest",
                        });
                    }
                } catch {
                    // Fallback an toàn cho các trình duyệt cũ
                    interactiveEl.scrollIntoView(false);
                }
            });
        }

        // Lắng nghe click với { passive: true } để không ảnh hưởng đến tốc độ phản hồi
        document.addEventListener("click", handleInteraction, { passive: true });
        // Thêm touchstart để phản hồi nhanh hơn trên mobile (trước khi click fire)
        document.addEventListener("touchstart", handleInteraction, { passive: true });

        return () => {
            document.removeEventListener("click", handleInteraction);
            document.removeEventListener("touchstart", handleInteraction);
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }
        };
    }, []);

    return null;
}
