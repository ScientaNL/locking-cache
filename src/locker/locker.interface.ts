export interface Locker {
	defaultLockDurationMs: number;
	lock(key: string, maxLockDurationMs?: number): Promise<Lock>;
}

export interface Lock {
	readonly key: string;
	unlock(): Promise<void>;
}
