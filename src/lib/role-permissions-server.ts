import { prisma } from "@/lib/prisma";
import {
    getDefaultLakeRolePermissionsConfig,
    parseLakeRolePermissionsPayload,
    type LakeRolePermissionsConfig,
} from "@/lib/role-permissions";

export const LAKE_ROLE_PERMISSIONS_ENTITY_TYPE = "LakeRolePermissions";
export const LAKE_ROLE_PERMISSIONS_UPDATED_ACTION = "LAKE_ROLE_PERMISSIONS_UPDATED";

export async function loadLakeRolePermissionsConfig(lakeId: string): Promise<LakeRolePermissionsConfig> {
    try {
        const latestEvent = await prisma.auditEvent.findFirst({
            where: {
                lakeId,
                entityType: LAKE_ROLE_PERMISSIONS_ENTITY_TYPE,
                entityId: lakeId,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                payload: true,
                createdAt: true,
                createdBy: true,
            },
        });

        if (!latestEvent) {
            return getDefaultLakeRolePermissionsConfig();
        }

        const config = parseLakeRolePermissionsPayload(latestEvent.payload);
        return {
            ...config,
            updatedAt: config.updatedAt ?? latestEvent.createdAt.toISOString(),
            updatedBy: config.updatedBy ?? latestEvent.createdBy,
        };
    } catch (error) {
        console.error("[RolePermissions] Failed to load lake role permissions:", error);
        return getDefaultLakeRolePermissionsConfig();
    }
}

export async function saveLakeRolePermissionsConfig(
    lakeId: string,
    actorUserId: string,
    config: LakeRolePermissionsConfig,
): Promise<LakeRolePermissionsConfig> {
    const nowIso = new Date().toISOString();
    const normalized: LakeRolePermissionsConfig = {
        ...config,
        updatedAt: nowIso,
        updatedBy: actorUserId,
    };

    await prisma.auditEvent.create({
        data: {
            lakeId,
            entityType: LAKE_ROLE_PERMISSIONS_ENTITY_TYPE,
            entityId: lakeId,
            action: LAKE_ROLE_PERMISSIONS_UPDATED_ACTION,
            payload: JSON.stringify(normalized),
            createdBy: actorUserId,
        },
    });

    return normalized;
}
