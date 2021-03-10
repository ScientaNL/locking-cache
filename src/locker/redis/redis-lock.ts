import type Redlock from 'redlock';
import {Lock} from "../locker.interface";

export class RedisLock implements Lock {
	constructor(public readonly key: string, private readonly lock: Redlock.Lock) {}

	public unlock(): Promise<void> {
		return this.lock.unlock();
	}
}
