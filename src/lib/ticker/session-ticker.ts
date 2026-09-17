/**
 * Centralized Session Ticker Engine
 *
 * Provides a single shared 1,000ms clock source for all active session countdowns.
 * - Single setInterval regardless of how many session cards are displayed (1, 20, 50, 100+).
 * - Zero CPU overhead when inactive: automatically starts on 1st subscriber, stops when subscribers reach 0.
 * - Drift & Sleep correction: single window/document wake listener instead of per-card listeners.
 * - Memory leak safe: robust listener Set with unmount cleanup.
 */

export interface TimeInfo {
    label: string;
    isEndingSoon: boolean;
    isOvertime: boolean;
}

export function computeTimeInfoFromMs(plannedEndMs: number, nowMs: number): TimeInfo {
    const diffMs = plannedEndMs - nowMs;

    if (diffMs <= 0) {
        const overMs = -diffMs;
        const overH = Math.floor(overMs / 3_600_000);
        const overM = Math.floor((overMs % 3_600_000) / 60_000);
        const overS = Math.floor((overMs % 60_000) / 1_000);
        const label =
            overH > 0
                ? `+${String(overH).padStart(2, "0")}:${String(overM).padStart(2, "0")}:${String(overS).padStart(2, "0")}`
                : `+${String(overM).padStart(2, "0")}:${String(overS).padStart(2, "0")}`;
        return {
            label,
            isEndingSoon: true,
            isOvertime: true,
        };
    }

    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    const s = Math.floor((diffMs % 60_000) / 1_000);
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const isEndingSoon = diffMs < 15 * 60_000;

    return { label, isEndingSoon, isOvertime: false };
}

export function computeTimeInfo(plannedEndAtIso: string, serverOffsetMs: number = 0): TimeInfo {
    const plannedEndMs = new Date(plannedEndAtIso).getTime();
    const nowMs = Date.now() + serverOffsetMs;
    return computeTimeInfoFromMs(plannedEndMs, nowMs);
}

type TickerListener = () => void;

class SessionTickerService {
    private subscribers = new Set<TickerListener>();
    private timerId: NodeJS.Timeout | null = null;
    private serverOffsetMs: number = 0;
    private tickCount: number = 0;
    private isWakeListenerAttached: boolean = false;

    constructor() {
        this.handleWake = this.handleWake.bind(this);
    }

    public setServerOffsetMs(offsetMs: number): void {
        this.serverOffsetMs = offsetMs;
        this.notifyAll();
    }

    public getServerOffsetMs(): number {
        return this.serverOffsetMs;
    }

    public getNowMs(): number {
        return Date.now() + this.serverOffsetMs;
    }

    public getTickCount(): number {
        return this.tickCount;
    }

    public getSubscriberCount(): number {
        return this.subscribers.size;
    }

    public isRunning(): boolean {
        return this.timerId !== null;
    }

    public subscribe(listener: TickerListener): () => void {
        this.subscribers.add(listener);

        // Start ticking on first subscriber
        if (this.subscribers.size === 1) {
            this.start();
        }

        return () => {
            this.subscribers.delete(listener);
            // Auto stop when no more subscribers
            if (this.subscribers.size === 0) {
                this.stop();
            }
        };
    }

    private start(): void {
        if (this.timerId !== null) return;

        this.attachWakeListeners();
        this.timerId = setInterval(() => {
            this.tickCount++;
            this.notifyAll();
        }, 1_000);
    }

    private stop(): void {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.detachWakeListeners();
    }

    private notifyAll(): void {
        this.subscribers.forEach((listener) => {
            try {
                listener();
            } catch (err) {
                console.error("[SessionTicker] Error in subscriber callback:", err);
            }
        });
    }

    private handleWake(): void {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
            this.tickCount++;
            this.notifyAll();
        }
    }

    private attachWakeListeners(): void {
        if (typeof window === "undefined" || this.isWakeListenerAttached) return;
        document.addEventListener("visibilitychange", this.handleWake);
        window.addEventListener("focus", this.handleWake);
        window.addEventListener("online", this.handleWake);
        this.isWakeListenerAttached = true;
    }

    private detachWakeListeners(): void {
        if (typeof window === "undefined" || !this.isWakeListenerAttached) return;
        document.removeEventListener("visibilitychange", this.handleWake);
        window.removeEventListener("focus", this.handleWake);
        window.removeEventListener("online", this.handleWake);
        this.isWakeListenerAttached = false;
    }

    /**
     * Testing / benchmarking helper to reset state
     */
    public resetForTest(): void {
        this.stop();
        this.subscribers.clear();
        this.tickCount = 0;
        this.serverOffsetMs = 0;
    }
}

export const sessionTicker = new SessionTickerService();
