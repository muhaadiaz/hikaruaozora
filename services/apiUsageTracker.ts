
const RPM_LIMIT = 60;
const TIME_WINDOW_MS = 60 * 1000;

class ApiUsageTracker {
    private timestamps: number[] = [];
    private listeners: Set<() => void> = new Set();

    constructor() {
        // Periodically clean up timestamps even if no calls are made
        setInterval(() => this.cleanupTimestamps(), TIME_WINDOW_MS);
    }

    private cleanupTimestamps() {
        const now = Date.now();
        const sixtySecondsAgo = now - TIME_WINDOW_MS;
        const initialCount = this.timestamps.length;
        this.timestamps = this.timestamps.filter(ts => ts > sixtySecondsAgo);
        
        // Notify listeners only if the count changed, to avoid unnecessary re-renders
        if (this.timestamps.length !== initialCount) {
            this.notifyListeners();
        }
    }

    public trackApiCall() {
        const now = Date.now();
        this.timestamps.push(now);
        this.cleanupTimestamps();
        this.notifyListeners();
    }

    public getUsage() {
        this.cleanupTimestamps();
        const used = this.timestamps.length;
        const remaining = Math.max(0, RPM_LIMIT - used);
        const percentage = (remaining / RPM_LIMIT) * 100;
        return {
            used,
            remaining,
            limit: RPM_LIMIT,
            percentage,
        };
    }

    public subscribe(callback: () => void) {
        this.listeners.add(callback);
    }

    public unsubscribe(callback: () => void) {
        this.listeners.delete(callback);
    }

    private notifyListeners() {
        this.listeners.forEach(callback => callback());
    }
}

export const apiUsageTracker = new ApiUsageTracker();
