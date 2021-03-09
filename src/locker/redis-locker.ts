import type Redlock from 'redlock';
import { Lock, Locker } from "./locker.interface";

export class RedisLocker implements Locker {
	public defaultLockDurationMs: number = 500;

	constructor(private readonly redLock: Redlock, private readonly lockNamespace: string) {}

	public lock(key: string, maxLockDurationMs?: number): Promise<RedisLock> {
		return this.redLock.lock(`${this.lockNamespace}:${key}`, maxLockDurationMs ?? this.defaultLockDurationMs)
			.then(lock => new RedisLock(key, lock));
	}
}

export class RedisLock implements Lock {
	constructor(public readonly key: string, private readonly lock: Redlock.Lock) {}

	public unlock(): Promise<void> {
		return this.lock.unlock();
	}
}
