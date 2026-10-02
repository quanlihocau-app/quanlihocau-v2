"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    getAlarmPreferences,
    initAudioUnlock,
    triggerSessionAlarm,
    type AlarmPreferences,
} from "@/lib/sound/session-alarm";
import { sessionTicker } from "@/lib/ticker/session-ticker";
import type { SerializableSession } from "@/app/sessions/sessions-client";

interface UseSessionAlarmsOptions {
    sessions: SerializableSession[];
    onSelectSession?: (id: string) => void;
}

export function useSessionAlarms({ sessions, onSelectSession }: UseSessionAlarmsOptions) {
    const [prefs, setPrefs] = useState<AlarmPreferences>(() => getAlarmPreferences());
    
    // Lưu các session đã được thông báo để không lặp lại liên tục
    const notifiedEndingSoonRef = useRef<Map<string, number>>(new Map()); // sessionId -> plannedEndMs đã thông báo
    const notifiedOvertimeRef = useRef<Map<string, number>>(new Map()); // sessionId -> plannedEndMs đã thông báo

    // 1. Tự động unlock AudioContext khi chạm màn hình lần đầu
    useEffect(() => {
        const cleanup = initAudioUnlock();
        return cleanup;
    }, []);

    // 2. Lắng nghe cập nhật preferences từ LocalStorage/Event
    useEffect(() => {
        const handlePrefsChange = (e: Event) => {
            const customEvent = e as CustomEvent<AlarmPreferences>;
            if (customEvent.detail) {
                setPrefs(customEvent.detail);
            } else {
                setPrefs(getAlarmPreferences());
            }
        };

        window.addEventListener("qlhc_alarm_prefs_changed", handlePrefsChange);
        return () => {
            window.removeEventListener("qlhc_alarm_prefs_changed", handlePrefsChange);
        };
    }, []);

    // 3. Kiểm tra các phiên câu theo thời gian thực (qua Ticker)
    useEffect(() => {
        const checkSessions = () => {
            if (!prefs.soundEnabled && !prefs.vibrateEnabled) {
                return; // Đang tắt toàn bộ cảnh báo
            }

            const nowMs = sessionTicker.getNowMs();
            const currentSessionIds = new Set(sessions.map((s) => s.id));

            // Dọn dẹp các session không còn hoạt động
            for (const id of notifiedEndingSoonRef.current.keys()) {
                if (!currentSessionIds.has(id)) notifiedEndingSoonRef.current.delete(id);
            }
            for (const id of notifiedOvertimeRef.current.keys()) {
                if (!currentSessionIds.has(id)) notifiedOvertimeRef.current.delete(id);
            }

            const leadMs = prefs.leadMinutes * 60_000;

            for (const s of sessions) {
                const plannedEndMs = new Date(s.plannedEndAt).getTime();
                const diffMs = plannedEndMs - nowMs;

                const hutName = s.hutLinks[0]?.hut?.name ?? "Ô câu";
                const customerName = s.customer?.name ?? "Khách lẻ";

                // Trường hợp 1: Đã quá giờ (diffMs <= 0)
                if (diffMs <= 0) {
                    const lastNotifiedPlannedEnd = notifiedOvertimeRef.current.get(s.id);

                    // Nếu chưa thông báo hoặc phiên câu đã được gia hạn mốc mới
                    if (lastNotifiedPlannedEnd !== plannedEndMs) {
                        notifiedOvertimeRef.current.set(s.id, plannedEndMs);

                        // Phát chuông và rung
                        triggerSessionAlarm("OVERTIME", prefs);

                        // Toast thông báo nổi bật
                        const overtimeMinutes = Math.floor(-diffMs / 60_000);
                        const overtimeLabel =
                            overtimeMinutes > 0 ? `quá ${overtimeMinutes} phút` : "vừa hết giờ";

                        toast.error(`⚠️ ${hutName}: ĐÃ QUÁ GIỜ!`, {
                            description: `${customerName} • ${overtimeLabel}`,
                            duration: 10_000,
                            action: onSelectSession
                                ? {
                                      label: "Xem ô",
                                      onClick: () => onSelectSession(s.id),
                                  }
                                : undefined,
                        });
                    }
                }
                // Trường hợp 2: Sắp hết giờ (0 < diffMs <= leadMs)
                else if (diffMs <= leadMs) {
                    const lastNotifiedPlannedEnd = notifiedEndingSoonRef.current.get(s.id);

                    if (lastNotifiedPlannedEnd !== plannedEndMs) {
                        notifiedEndingSoonRef.current.set(s.id, plannedEndMs);

                        // Phát chuông và rung
                        triggerSessionAlarm("ENDING_SOON", prefs);

                        // Toast thông báo
                        const remainingMinutes = Math.ceil(diffMs / 60_000);
                        toast.warning(`🔔 ${hutName}: Sắp hết giờ câu`, {
                            description: `${customerName} • Còn ${remainingMinutes} phút`,
                            duration: 8_000,
                            action: onSelectSession
                                ? {
                                      label: "Xem ô",
                                      onClick: () => onSelectSession(s.id),
                                  }
                                : undefined,
                        });
                    }
                }
            }
        };

        // Kiểm tra ngay khi danh sách sessions thay đổi
        checkSessions();

        // Đăng ký kiểm tra mỗi giây đồng bộ với centralized ticker
        const unsubscribe = sessionTicker.subscribe(checkSessions);
        return unsubscribe;
    }, [sessions, prefs, onSelectSession]);

    return { prefs };
}
