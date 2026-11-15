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

// Singleton AudioContext & Master Compressor
let audioCtx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
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
        if (audioCtx && !masterCompressor) {
            // Dynamics Compressor giúp tăng tối đa âm lượng RMS mà không bị vỡ tiếng (clipping)
            // Cực kỳ quan trọng khi dùng loa điện thoại ngoài trời tại hồ câu
            masterCompressor = audioCtx.createDynamicsCompressor();
            masterCompressor.threshold.setValueAtTime(-6, audioCtx.currentTime);
            masterCompressor.knee.setValueAtTime(4, audioCtx.currentTime);
            masterCompressor.ratio.setValueAtTime(12, audioCtx.currentTime);
            masterCompressor.attack.setValueAtTime(0.002, audioCtx.currentTime);
            masterCompressor.release.setValueAtTime(0.12, audioCtx.currentTime);
            masterCompressor.connect(audioCtx.destination);
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
 * Chuông báo 1: Sắp hết giờ (Chime đôi ngân vang, cường độ âm thanh lớn chuyên dùng ngoài trời)
 * Phát 2 đợt "Ding - Dong... Ding - Dong" tần số cao (1320Hz - 1760Hz) xuyên thấu gió và tiếng nước.
 */
export function playEndingSoonTone(): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const dest = masterCompressor || ctx.destination;
        const now = ctx.currentTime;

        // 2 đợt Ding-Dong vang dội
        const bursts = [
            // Đợt 1
            { freq: 1318.51, start: now + 0.02, duration: 0.22, peak: 0.85 }, // E6
            { freq: 1760.00, start: now + 0.26, duration: 0.38, peak: 0.90 }, // A6
            // Đợt 2 (nhắc lại)
            { freq: 1318.51, start: now + 0.70, duration: 0.22, peak: 0.85 },
            { freq: 1760.00, start: now + 0.94, duration: 0.45, peak: 0.92 },
        ];

        bursts.forEach(({ freq, start, duration, peak }) => {
            // Sóng hài tam giác (triangle) kết hợp răng cưa (sawtooth) cho âm sắc dày, vang xa
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(peak, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

            osc.connect(gain);
            gain.connect(dest);

            osc.start(start);
            osc.stop(start + duration + 0.02);
        });
    } catch {
        // Ignore audio playback errors
    }
}

/**
 * Chuông báo 2: Đã quá giờ (Báo động khẩn cấp âm lượng cực đại x10, còi đôi xuyên thấu môi trường ồn ào)
 * Chuỗi xung còi kép dồn dập (2090Hz & 2640Hz) đánh bật tiếng ồn hồ câu cá ngoài trời.
 */
export function playOvertimeTone(): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const dest = masterCompressor || ctx.destination;
        const now = ctx.currentTime;

        // Chuỗi 6 xung còi dồn dập, âm lượng đỉnh 0.95
        const pulses = [
            { freq: 2093.0, start: now + 0.02, duration: 0.12, type: "sawtooth" as const, peak: 0.95 },
            { freq: 2637.0, start: now + 0.16, duration: 0.14, type: "sawtooth" as const, peak: 0.95 },
            { freq: 2093.0, start: now + 0.34, duration: 0.12, type: "sawtooth" as const, peak: 0.95 },
            { freq: 2637.0, start: now + 0.48, duration: 0.16, type: "sawtooth" as const, peak: 0.95 },
            { freq: 2093.0, start: now + 0.70, duration: 0.14, type: "sawtooth" as const, peak: 0.95 },
            { freq: 2793.8, start: now + 0.86, duration: 0.32, type: "sawtooth" as const, peak: 0.95 },
        ];

        pulses.forEach(({ freq, start, duration, type, peak }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(peak, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

            osc.connect(gain);
            gain.connect(dest);

            osc.start(start);
            osc.stop(start + duration + 0.02);
        });
    } catch {
        // Ignore audio playback errors
    }
}

/**
 * Rung máy khi sắp hết giờ (nhịp kép rõ ràng)
 */
export function triggerEndingSoonVibration(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate([300, 120, 300, 120, 500]);
        } catch {
            // Ignore
        }
    }
}

/**
 * Rung máy khi đã quá giờ (chuỗi rung mạnh cảnh báo liên tục)
 */
export function triggerOvertimeVibration(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate([400, 100, 400, 100, 600, 100, 800]);
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
