import {expect} from "chai";
import {describe} from "mocha";
import {TokenStoreStub} from "./token-store.stub";
import {CacheErrorEvents, LockingCache, TokenStore} from "../src/locking-cache";
import {Locker} from "../src/locker/locker.interface";
import {SimpleLock, SimpleLocker} from "../src/locker/simple-locker";

const cacheFactory = <T>(tokenStore?: TokenStore<T>, locker?: Locker) => new LockingCache(tokenStore ?? new TokenStoreStub<T>(), locker);

describe('locking-cache', () => {
	it('should have no values', async () => {
		const cache = cacheFactory<string>();
		const foo = await cache.getStoredValue('foo');
		expect(foo).to.eq(undefined);
	});

	it('should cache a string', async () => {
		const cache = cacheFactory<string>();
		const resolvedValue = {value: 'bar'};
		const cached = await cache.getValue('foo', () => Promise.resolve(resolvedValue));
		const value = await cache.getStoredValue('foo');
		expect(value).to.eq(resolvedValue.value);
		expect(cached).to.eq(value);
	});

	it('should cache an object', async () => {
		const cache = cacheFactory<object>();
		const resolvedValue = {value: {} };
		const cached = await cache.getValue('foo', () => Promise.resolve(resolvedValue));
		const value = await cache.getStoredValue('foo');
		expect(value).to.eq(resolvedValue.value);
		expect(cached).to.eq(value);
	});

	it('should cache and lock a value', async () => {
		const cache = cacheFactory<object>();
		const a = {}, b = {};
		let bResolved = false;
		const cacheA = cache.getValue('foo', () => Promise.resolve({value: a}));
		const cacheB = cache.getValue('foo', () => {bResolved = true; return Promise.resolve({value: b})});

		// value is not yet resolved to cache now
		const value = await cache.getStoredValue('foo');
		expect(value).to.eq(undefined);

		const cachedA = await cacheA;
		const cachedB = await cacheB;

		// first value (a) is cached and b is not resolved.
		expect(cachedA).to.eq(a);
		expect(cachedB).to.eq(a);
		expect(bResolved).to.eq(false);
	});

	it('should cache and remove a value after lifetime', async () => {
		const cache = cacheFactory<string>();
		const value = {value: 'bar', expiresInSec: 0.01};
		const cached = await cache.getValue('foo', () => Promise.resolve(value));
		const stored = await cache.getStoredValue('foo');
		await new Promise( resolve => setTimeout(resolve, 10) );
		const storedTTL = await cache.getStoredValue('foo');

		expect(cached).to.eq(stored);
		expect(stored).to.eq(value.value);
		expect(storedTTL).to.eq(undefined);
	});
});

describe('locking-cache-errors', () => {
	it('should error on resolveError', async () => {
		const cache = cacheFactory<string>();
		const error = new Error();

		let resolveEventError = null, resolveCatchError = null;
		cache.on(CacheErrorEvents.resolveError, (error) => resolveEventError = error);

		try {
			await cache.getValue('foo', () => Promise.reject(error));
		} catch (e) {
			resolveCatchError = e;
		}
		const stored = await cache.getStoredValue('foo');

		expect(stored).to.eq(undefined);
		expect(resolveEventError).to.eq(resolveCatchError);
		expect(resolveCatchError).to.eq(error);
	});

	it('should error on storeGetError', async () => {
		const error = new Error();
		class TokenStore<T> extends TokenStoreStub<T> {
			public get(key: string | number) {
				return Promise.reject(error);
			}
		}
		const cache = cacheFactory<string>(new TokenStore<string>());

		let storeGetEventError = null, storeGetCatchError = null;
		cache.on(CacheErrorEvents.storeGetError, (error) => storeGetEventError = error);

		try {
			await cache.getValue('foo', () => Promise.reject(error));
		} catch (e) {
			storeGetCatchError = e;
		}
		const stored = await cache.getStoredValue('foo', true);
		expect(stored).to.eq(undefined);

		expect(storeGetEventError).to.eq(storeGetCatchError);
		expect(storeGetCatchError).to.eq(error);
	});

	it('should error on storeSetError', async () => {
		const error = new Error();
		class TokenStore<T> extends TokenStoreStub<T> {
			public set(key: string | number, value: T) {
				return Promise.reject(error);
			}
		}
		const cache = cacheFactory<string>(new TokenStore<string>());

		let storeSetEventError = null, storeSetCatchError = null;
		cache.on(CacheErrorEvents.storeSetError, (error) => storeSetEventError = error);

		try {
			await cache.getValue('foo', () => Promise.resolve({value: 'bar'}));
		} catch (e) {
			storeSetCatchError = e;
		}
		const stored = await cache.getStoredValue('foo', true);
		expect(stored).to.eq(undefined);

		expect(storeSetEventError).to.eq(storeSetCatchError);
		expect(storeSetCatchError).to.eq(error);
	});

	it('should error on lockError if configured', async () => {
		const error = new Error();
		class ErrorLocker extends SimpleLocker {
			public lock(key: string, maxLockDurationMs?: number) {
				return Promise.reject(error);
			}
		}
		const cache = cacheFactory<string>(undefined, new ErrorLocker());
		cache.cacheOnLockError = false;
		let lockEventError = null, lockCatchError = null;
		cache.on(CacheErrorEvents.lockError, (error) => lockEventError = error);

		try {
			await cache.getValue('foo', () => Promise.resolve({value: 'bar'}));
		} catch (e) {
			lockCatchError = e;
		}
		const stored = await cache.getStoredValue('foo', true);
		expect(stored).to.eq(undefined);

		expect(lockEventError).to.eq(lockCatchError);
		expect(lockCatchError).to.eq(error);
	});

	it('should not error on lockError if not configured', async () => {
		const error = new Error();
		class ErrorLocker extends SimpleLocker {
			public lock(key: string, maxLockDurationMs?: number) {
				return Promise.reject(error);
			}
		}
		const cache = cacheFactory<string>(undefined, new ErrorLocker());
		cache.cacheOnLockError = true;

		let lockEventError = null, lockCatchError = null;
		cache.on(CacheErrorEvents.lockError, (error) => lockEventError = error);

		let cached = undefined;
		try {
			cached = await cache.getValue('foo', () => Promise.resolve({value: 'bar'}));
		} catch (e) {
			lockCatchError = e;
		}

		const stored = await cache.getStoredValue('foo', true);

		expect(stored).to.eq('bar');
		expect(cached).to.eq('bar');

		expect(lockEventError).to.eq(error);
		expect(lockCatchError).to.eq(null);
	});

	it('should not error on unlockError', async () => {
		const error = new Error();
		class ErrorLocker extends SimpleLocker {
			public lock(key: string, maxLockDurationMs?: number) {
				return Promise.resolve(new SimpleLock(key, () => Promise.reject(error)));
			}
		}
		const cache = cacheFactory<string>(undefined, new ErrorLocker());

		let unlockEventError = null, unlockCatchError = null;
		cache.on(CacheErrorEvents.unlockError, (error) => unlockEventError = error);

		let cached = undefined;
		try {
			cached = await cache.getValue('foo', () => Promise.resolve({value: 'bar'}));
		} catch (e) {
			unlockCatchError = e;
		}

		const stored = await cache.getStoredValue('foo', true);

		expect(stored).to.eq('bar');
		expect(cached).to.eq('bar');

		expect(unlockEventError).to.eq(error);
		expect(unlockCatchError).to.eq(null);
	});
});
