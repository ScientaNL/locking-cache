import {EventEmitter} from "events";
import {Lock, Locker, SimpleLocker} from "./locker";
import {SimpleStorage} from "./storage/simple-storage";
import {TokenStorage} from "./storage/token-storage.interface";
import {NoResolvedValueError} from "./no-resolved-value-error";

export enum CacheErrorEvents {
	resolveError = 'resolveError',
	storeGetError = 'storeGetError',
	storeSetError = 'storeSetError',
	lockError = 'lockError',
	unlockError = 'unlockError'
}

export interface ValueResolver<T> {
	(): Promise<ResolvedExpiringValue<T> | undefined>;
}

export interface ResolvedExpiringValue<T> {
	value: T
	expiresInSec?: number
}

export class LockingCache<T> extends EventEmitter {
	public cacheOnLockError = true;

	constructor(private readonly tokenStore: TokenStorage<T> = new SimpleStorage<T>(), private readonly locker: Locker = new SimpleLocker()) {
		super();
	}

	public getStoredValue(cacheKey: string, catchError = false): Promise<T | null | undefined> {
		let promise = this.tokenStore.get(cacheKey);
		if (catchError) {
			promise = promise.catch(err => {
				this.emit(CacheErrorEvents.storeGetError, err);
				return undefined;
			});
		}
		return promise;
	}

	public getValue(cacheKey: string, valueResolver: ValueResolver<T>, maxLockDurationMs?: number): Promise<T | null | undefined> {
		return this.getStoredValue(cacheKey)
			.then(value => value ?? this.resolveValueLocked(cacheKey, valueResolver, maxLockDurationMs));
	}

	protected resolveValueLocked(
		cacheKey: string,
		valueResolver: ValueResolver<T>,
		maxLockDurationMs?: number
	): Promise<T | null | undefined> {
		const lockPromise: Promise<Lock | undefined> = this.locker.lock(cacheKey, maxLockDurationMs)
			.catch(err => {
				this.emit(CacheErrorEvents.lockError, err);
				if (!this.cacheOnLockError) {
					throw err;
				}
				return undefined;
			});

		return lockPromise.then(lock => this.getStoredValue(cacheKey, true)
			.then(value => value ?? this.resolveAndStoreValue(cacheKey, valueResolver))
			.then(value => {
				if (!lock) {
					return value;
				}
				return lock.unlock().catch(err => {
					this.emit(CacheErrorEvents.unlockError, err);
					return undefined;
				}).then(() => value);
			})
		);
	}

	protected resolveAndStoreValue(cacheKey: string, valueResolver: ValueResolver<T>): Promise<T | undefined> {
		return valueResolver()
			.then(resolvedExpiringValue => {
				if (!resolvedExpiringValue) {
					throw new NoResolvedValueError('There is no resolved value to cache');
				}
				return resolvedExpiringValue;
			})
			.catch(err => {
				err = err ?? new Error('Unknown error resolving cacheable value');
				this.emit(CacheErrorEvents.resolveError, err);
				throw err;
			})
			.then(resolvedExpiringValue => this.tokenStore.set(cacheKey, resolvedExpiringValue.value, resolvedExpiringValue.expiresInSec)
				.then(() => resolvedExpiringValue.value)
				.catch((err) => {
					this.emit(CacheErrorEvents.storeSetError, err);
					throw err;
				})
			);
	}

	public addListener(event: CacheErrorEvents, listener: (err: any) => void): this {
		return super.addListener(event, listener);
	}

	/**
	 * Subscribe to `clientError` events.
	 * Your callback is invoked every time this event is emitted.
	 */
	public on(event: CacheErrorEvents, listener: (err: any) => void): this {
		return super.on(event, listener);
	}

	/**
	 * Subscribe to `clientError` events.
	 * Your callback is invoked only once for this event.
	 */
	public once(event: CacheErrorEvents, listener: (err: any) => void): this {
		return super.once(event, listener);
	}

	/**
	 * Unsubscribe from the `clientError` event.
	 */
	public removeListener(event: CacheErrorEvents, listener: (err: any) => void): this {
		return super.removeListener(event, listener);
	}
}
