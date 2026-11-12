"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import { dismissTicketJob, readTicketJobs, syncTicketJobs } from "@/lib/offline/submit-ticket";
import type { TicketJob } from "@/lib/offline/ticket-queue";
import { planSessionNotifications } from "@/lib/native/session-notifications";
import { Capacitor } from "@capacitor/core";

export function OfflineSync() {
    const { isOnline } = useNetworkStatus();
    const [jobs, setJobs] = useState<TicketJob[]>([]);

    useEffect(() => {
        let cancelled = false;
        syncTicketJobs({ online: isOnline }).finally(() => {
            if (!cancelled && typeof window !== "undefined") {
                setJobs(readTicketJobs(window.localStorage));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [isOnline]);

    useEffect(() => {
        if (!isOnline || !Capacitor.isNativePlatform()) return;
        const lead = 10;
        fetch("/api/fishing-sessions?status=ACTIVE")
            .then((response) => (response.ok ? response.json() : []))
            .then(async (sessions: { id?: string; plannedEndAt?: string; hutLinks?: { hut?: { name?: string } }[] }[]) => {
                const planned = planSessionNotifications(
                    (Array.isArray(sessions) ? sessions : [])
                        .filter((session) => session.id && session.plannedEndAt)
                        .map((session) => ({
                            id: session.id as string,
                            plannedEndAt: session.plannedEndAt as string,
                            label: session.hutLinks?.map((link) => link.hut?.name).filter(Boolean).join(", ") || "Vé câu",
                        })),
                    lead,
                    new Date(),
                );
                if (!planned.length) return;
                const { LocalNotifications } = await import("@capacitor/local-notifications");
                const permission = await LocalNotifications.requestPermissions();
                if (permission.display !== "granted") return;
                await LocalNotifications.schedule({
                    notifications: planned.map((item) => ({
                        id: item.id,
                        title: item.title,
                        body: item.body,
                        schedule: { at: new Date(item.at) },
                    })),
                });
            })
            .catch(() => {});
    }, [isOnline]);

    if (!jobs.length) return null;
    const pending = jobs.filter((job) => job.status === "pending").length;
    const conflicts = jobs.filter((job) => job.status === "conflict");

    return (
        <div className="fixed inset-x-3 bottom-24 z-40 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg">
            <p className="font-bold">{pending} vé đang chờ gửi</p>
            {conflicts.map((job) => (
                <div key={job.id} className="mt-2 flex items-start justify-between gap-2">
                    <p>{job.conflictMessage || job.summary}</p>
                    <button
                        type="button"
                        className="min-h-11 shrink-0 rounded-xl bg-white px-3 font-bold"
                        onClick={() => setJobs(dismissTicketJob(job.id))}
                    >
                        Bỏ
                    </button>
                </div>
            ))}
            <button
                type="button"
                className="mt-2 min-h-11 w-full rounded-xl bg-[#1B3B2B] font-bold text-white"
                onClick={() => {
                    syncTicketJobs({ online: true }).then(() => setJobs(readTicketJobs(window.localStorage)));
                }}
            >
                Gửi ngay
            </button>
        </div>
    );
}
