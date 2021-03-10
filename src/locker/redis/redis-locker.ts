import type Redlock from 'redlock';
import {Locker} from "../locker.interface";
import {RedisLock} from "./redis-lock";

export class RedisLocker implements Locker {
	public defaultLockDurationMs: number = 500;

	constructor(private readonly redLock: Redlock, private readonly lockNamespace: string) {}

	public lock(key: string, maxLockDurationMs?: number): Promise<RedisLock> {
		return this.redLock.lock(`${this.lockNamespace}:${key}`, maxLockDurationMs ?? this.defaultLockDurationMs)
			.then(lock => new RedisLock(key, lock));
	}
}
