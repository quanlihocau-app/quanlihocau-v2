"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/network/fetch-json";

export interface CachedProduct {
    id: string;
    name: string;
    priceVnd: number;
    sku: string | null;
    stock?: number;
}

export const productCatalogKeys = {
    all: ["products-catalog"] as const,
    list: () => [...productCatalogKeys.all, "list"] as const,
};

export async function fetchProducts(signal?: AbortSignal): Promise<CachedProduct[]> {
    const data = await fetchJson("/api/products", signal);
    if (!data || typeof data !== "object" || !("products" in data) || !Array.isArray(data.products)) {
        throw new Error("Không thể tải danh sách sản phẩm.");
    }
    return data.products as CachedProduct[];
}

/**
 * Hook lấy danh mục sản phẩm (mồi câu, đồ uống, thức ăn) với bộ nhớ đệm React Query:
 * - Hiển thị tức thì 0ms từ cache RAM / LocalStorage.
 * - staleTime: 5 phút (tránh gọi API thừa thãi mỗi lần mở popup Thêm món hoặc Thu ngân).
 * - Tự động revalidate ngầm khi dữ liệu cũ.
 */
export function useProducts(initialData?: CachedProduct[]) {
    return useQuery({
        queryKey: productCatalogKeys.list(),
        queryFn: ({ signal }) => fetchProducts(signal),
        initialData,
        staleTime: 1000 * 60 * 5, // 5 phút
        gcTime: 1000 * 60 * 60 * 24, // 24 giờ trong bộ nhớ
    });
}
