"use client";

import { useQuery } from "@tanstack/react-query";

export interface CachedProduct {
    id: string;
    name: string;
    priceVnd: number;
    sku: string | null;
    stockQuantity?: number;
}

export const productCatalogKeys = {
    all: ["products-catalog"] as const,
    list: () => [...productCatalogKeys.all, "list"] as const,
};

/**
 * Hook lấy danh mục sản phẩm (mồi câu, đồ uống, thức ăn) với bộ nhớ đệm React Query:
 * - Hiển thị tức thì 0ms từ cache RAM / LocalStorage.
 * - staleTime: 5 phút (tránh gọi API thừa thãi mỗi lần mở popup Thêm món hoặc Thu ngân).
 * - Tự động revalidate ngầm khi dữ liệu cũ.
 */
export function useProducts(initialData?: CachedProduct[]) {
    return useQuery({
        queryKey: productCatalogKeys.list(),
        queryFn: async () => {
            const res = await fetch("/api/products");
            if (!res.ok) {
                throw new Error("Không thể tải danh sách sản phẩm.");
            }
            const data = (await res.json()) as { products?: CachedProduct[] };
            return data.products || [];
        },
        initialData,
        staleTime: 1000 * 60 * 5, // 5 phút
        gcTime: 1000 * 60 * 60 * 24, // 24 giờ trong bộ nhớ
    });
}
