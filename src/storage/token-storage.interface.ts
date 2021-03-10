export interface TokenStorage<T> {
	/**
	 * get a cached key
	 *
	 * @param key cache key or an array of keys
	 */
	get(key: string | number): Promise<T | null | undefined>;

	/**
	 * set a cached key
	 *
	 * @param key cache key
	 * @param value A element to cache.
	 * @param ttlSec The time to live in seconds.
	 */
	set(
		key: string | number,
		value?: T,
		ttlSec?: number
	): Promise<any>;
}
