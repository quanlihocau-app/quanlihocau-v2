"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    addQuickHutAction,
    deleteQuickHutAction,
    addQuickPackageAction,
    deleteQuickPackageAction,
} from "@/app/sessions/quick-create-actions";

export interface FishingHut {
    id: string;
    name: string;
    areaId: string;
    currentSessionId: string | null;
    area: {
        id: string;
        name: string;
    };
}

export interface FishingPackage {
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
    overtimeHourlyVnd?: number;
}

// =============================================================================
// 1. QUERY KEYS
// =============================================================================
export const catalogKeys = {
    all: ["fishing-catalog"] as const,
    spots: () => [...catalogKeys.all, "spots"] as const,
    packages: () => [...catalogKeys.all, "packages"] as const,
};

// =============================================================================
// 2. CUSTOM HOOK: LẤY DANH SÁCH Ô CÂU (0ms Cache, Auto Background Revalidate)
// =============================================================================
export function useFishingSpots(initialData?: FishingHut[]) {
    const query = useQuery({
        queryKey: catalogKeys.spots(),
        queryFn: async () => {
            const res = await fetch("/api/huts");
            if (!res.ok) {
                throw new Error("Không thể tải danh sách ô câu.");
            }
            return (await res.json()) as FishingHut[];
        },
        initialData,
        staleTime: 1000 * 60 * 5, // 5 phút không gọi lại API thừa thãi
        gcTime: 1000 * 60 * 60 * 24, // 24 giờ lưu trong RAM & LocalStorage
    });

    const spots = query.data ?? [];
    const availableSpots = spots.filter((h) => h.currentSessionId === null);
    const occupiedSpots = spots.filter((h) => h.currentSessionId !== null);

    return {
        ...query,
        spots,
        availableSpots,
        occupiedSpots,
    };
}

// =============================================================================
// 3. CUSTOM HOOK: LẤY DANH SÁCH GÓI CÂU
// =============================================================================
export function useFishingPackages(initialData?: FishingPackage[]) {
    return useQuery({
        queryKey: catalogKeys.packages(),
        queryFn: async () => {
            const res = await fetch("/api/packages");
            if (!res.ok) {
                throw new Error("Không thể tải danh sách gói câu.");
            }
            return (await res.json()) as FishingPackage[];
        },
        initialData,
        staleTime: 1000 * 60 * 10, // 10 phút
        gcTime: 1000 * 60 * 60 * 24,
    });
}

// =============================================================================
// 4. CUSTOM HOOK: CÁC MUTATION THAO TÁC NHANH KÈM CACHE INVALIDATION
// =============================================================================
export function useQuickCatalogMutations() {
    const queryClient = useQueryClient();

    // Thêm nhanh ô câu
    const createSpotMutation = useMutation({
        mutationFn: async (input: { name: string; areaId?: string }) => {
            const res = await addQuickHutAction(input);
            if (!res.ok || !res.data) {
                throw new Error(res.error || "Không thể tạo ô câu.");
            }
            return res.data;
        },
        onSuccess: (newHut) => {
            // Cập nhật ngay vào cache để giao diện hiển thị tức thì (0ms)
            queryClient.setQueryData<FishingHut[]>(catalogKeys.spots(), (old) => {
                if (!old) return [];
                return [
                    ...old,
                    {
                        id: newHut.id,
                        name: newHut.name,
                        areaId: newHut.areaId,
                        currentSessionId: null,
                        area: {
                            id: newHut.areaId,
                            name: newHut.areaName,
                        },
                    },
                ];
            });

            // Đồng thời kích hoạt Invalidate để đồng bộ chuẩn xác với cơ sở dữ liệu ngầm
            queryClient.invalidateQueries({ queryKey: catalogKeys.spots() });
        },
    });

    // Xóa mềm ô câu
    const deleteSpotMutation = useMutation({
        mutationFn: async (hutId: string) => {
            const res = await deleteQuickHutAction({ hutId });
            if (!res.ok) {
                throw new Error(res.error || "Không thể xóa ô câu.");
            }
            return hutId;
        },
        onSuccess: (deletedId) => {
            queryClient.setQueryData<FishingHut[]>(catalogKeys.spots(), (old) => {
                if (!old) return [];
                return old.filter((h) => h.id !== deletedId);
            });
            queryClient.invalidateQueries({ queryKey: catalogKeys.spots() });
        },
    });

    // Thêm nhanh gói câu
    const createPackageMutation = useMutation({
        mutationFn: async (input: { name: string; durationMinutes: number; priceVnd: number }) => {
            const res = await addQuickPackageAction(input);
            if (!res.ok || !res.data) {
                throw new Error(res.error || "Không thể tạo gói câu.");
            }
            return res.data;
        },
        onSuccess: (newPkg) => {
            queryClient.setQueryData<FishingPackage[]>(catalogKeys.packages(), (old) => {
                if (!old) return [];
                return [...old, newPkg];
            });
            queryClient.invalidateQueries({ queryKey: catalogKeys.packages() });
        },
    });

    // Xóa mềm gói câu
    const deletePackageMutation = useMutation({
        mutationFn: async (packageId: string) => {
            const res = await deleteQuickPackageAction({ packageId });
            if (!res.ok) {
                throw new Error(res.error || "Không thể xóa gói câu.");
            }
            return packageId;
        },
        onSuccess: (deletedId) => {
            queryClient.setQueryData<FishingPackage[]>(catalogKeys.packages(), (old) => {
                if (!old) return [];
                return old.filter((p) => p.id !== deletedId);
            });
            queryClient.invalidateQueries({ queryKey: catalogKeys.packages() });
        },
    });

    return {
        createSpotMutation,
        deleteSpotMutation,
        createPackageMutation,
        deletePackageMutation,
    };
}
