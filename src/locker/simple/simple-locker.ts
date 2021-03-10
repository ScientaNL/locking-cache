import type {exec, release} from 'lock';
import {Locker} from "../locker.interface";
import {SimpleLock} from "./simple-lock";

//ILock from lock.d.ts misses isLocked string param
interface ILock {
	(key: string | string[], exec: exec): void;
	isLocked(key: string): boolean;
}

export type releaser = () => Promise<void>;

export class SimpleLocker implements Locker {
	public defaultLockDurationMs: number = NaN;

	private readonly lockFn: ILock;
	private readonly lockPromise: (key: string) => Promise<releaser>;

	constructor() {
		this.lockFn = SimpleLocker.loadLockDependency();
		this.lockPromise = this.createPromisifiedLock();
	}

	public isLocked(key: string): boolean {
		return this.lockFn.isLocked(key);
	}

	public lock(key: string, maxLockDurationMs?: number): Promise<SimpleLock> {
		return this.lockPromise(key)
			.then((releaser) => {
				const lock = new SimpleLock(key, releaser);
				if (maxLockDurationMs && maxLockDurationMs >= 0) {
					setTimeout(() => {
						lock.unlock();
					}, maxLockDurationMs);
				}
				return lock;
			});
	}

	private createPromisifiedLock() {
		return (key: string) => new Promise<releaser>((resolve) => {
			this.lockFn(key, (release) => {
				resolve(this.promisifyRelease(release));
			});
		});
	}

	private promisifyRelease(release: release): releaser {
		return () => new Promise<void>((resolve) => {
			release(() => {
				resolve();
			})();
		});
	}

	private static loadLockDependency(): ILock {
		try {
			return require('lock').Lock();
		} catch (err) {
			if (err.code === 'MODULE_NOT_FOUND') {
				throw new Error(`Please install lock package manually`);
			}

			throw err;
		}
	}
}
