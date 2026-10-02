/**
 * Session Alarm Audio & Vibration Engine
 * 
 * Sử dụng Web Audio API để phát âm thanh chuông báo không phụ thuộc file ngoài,
 * kết hợp Web Vibration API để rung máy khi phiên câu sắp hết giờ hoặc lố giờ.
 */

export interface AlarmPreferences {
    soundEnabled: boolean;
    vibrateEnabled: boolean;
    leadMinutes: number; // Số phút báo trước khi hết giờ (ví dụ: 10 phút)
}

const STORAGE_KEY = "qlhc_alarm_prefs_v1";

const DEFAULT_PREFS: AlarmPreferences = {
    soundEnabled: true,
    vibrateEnabled: true,
    leadMinutes: 10,
};

// Singleton AudioContext
let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
        if (!audioCtx) {
            const AudioContextClass =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    } catch {
        return null;
    }
}

/**
 * Tự động unlock AudioContext khi người dùng chạm lần đầu vào màn hình
 */
export function initAudioUnlock(): () => void {
    if (typeof window === "undefined" || isAudioUnlocked) return () => {};

    const unlock = () => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
            ctx.resume().then(() => {
                isAudioUnlocked = true;
            }).catch(() => {});
        } else if (ctx) {
            isAudioUnlocked = true;
        }

        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { passive: true, once: true });
    window.addEventListener("touchstart", unlock, { passive: true, once: true });
    window.addEventListener("keydown", unlock, { passive: true, once: true });

    return () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
    };
}

/**
 * Lấy tùy chọn cấu hình từ LocalStorage
 */
export function getAlarmPreferences(): AlarmPreferences {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                soundEnabled: parsed.soundEnabled ?? DEFAULT_PREFS.soundEnabled,
                vibrateEnabled: parsed.vibrateEnabled ?? DEFAULT_PREFS.vibrateEnabled,
                leadMinutes: Number(parsed.leadMinutes) || DEFAULT_PREFS.leadMinutes,
            };
        }
    } catch {
        // Fallback default
    }
    return DEFAULT_PREFS;
}

/**
 * Lưu tùy chọn cấu hình vào LocalStorage
 */
export function saveAlarmPreferences(prefs: Partial<AlarmPreferences>): AlarmPreferences {
    const current = getAlarmPreferences();
    const updated: AlarmPreferences = { ...current, ...prefs };
    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("qlhc_alarm_prefs_changed", { detail: updated }));
        } catch {
            // Ignore quota errors
        }
    }
    return updated;
}

/**
 * Chuông báo 1: Sắp hết giờ (Âm thanh 2 nốt ấm áp, du dương cảnh báo nhẹ)
 */
export function playEndingSoonTone(): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const notes = [
            { freq: 659.25, start: now + 0.05, duration: 0.28 }, // E5
            { freq: 880.00, start: now + 0.32, duration: 0.45 }, // A5
        ];

        notes.forEach(({ freq, start, duration }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.22, start + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        });
    } catch {
        // Ignore audio playback errors
    }
}

/**
 * Chuông báo 2: Đã quá giờ (Âm thanh 3 nốt dứt khoát, rõ ràng)
 */
export function playOvertimeTone(): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const notes = [
            { freq: 880.00, start: now + 0.02, duration: 0.18 }, // A5
            { freq: 739.99, start: now + 0.22, duration: 0.18 }, // F#5
            { freq: 659.25, start: now + 0.42, duration: 0.40 }, // E5
        ];

        notes.forEach(({ freq, start, duration }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        });
    } catch {
        // Ignore audio playback errors
    }
}

/**
 * Rung máy khi sắp hết giờ (nhẹ nhàng 2 nhịp)
 */
export function triggerEndingSoonVibration(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate([150, 100, 150]);
        } catch {
            // Ignore
        }
    }
}

/**
 * Rung máy khi đã quá giờ (3 nhịp dứt khoát)
 */
export function triggerOvertimeVibration(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate([250, 100, 250, 100, 400]);
        } catch {
            // Ignore
        }
    }
}

/**
 * Phát cảnh báo hỗn hợp (Âm thanh + Rung máy) tuân theo cấu hình người dùng
 */
export function triggerSessionAlarm(type: "ENDING_SOON" | "OVERTIME", customPrefs?: AlarmPreferences): void {
    const prefs = customPrefs || getAlarmPreferences();

    if (type === "ENDING_SOON") {
        if (prefs.soundEnabled) playEndingSoonTone();
        if (prefs.vibrateEnabled) triggerEndingSoonVibration();
    } else if (type === "OVERTIME") {
        if (prefs.soundEnabled) playOvertimeTone();
        if (prefs.vibrateEnabled) triggerOvertimeVibration();
    }
}
