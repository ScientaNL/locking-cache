import {TokenStore} from "../src/locking-cache";

export class TokenStoreStub<T> implements TokenStore<T> {

	constructor(
		private readonly data = new Map<string,T>(),
		private readonly ttlTimeouts = new Map<string,NodeJS.Timeout>()
	) {}

	public get(key: string | number) {
		return Promise.resolve(this.data.get(key+''))
	}

	public set(key: string | number, value: T, ttlSec?: number) {
		key += '';
		this.data.set(key+'', value);
		this.setTTL(key as string, ttlSec);
		return Promise.resolve();
	}

	private setTTL(key: string, ttlSec?: number) {
		if (this.ttlTimeouts.has(key)) {
			clearTimeout(this.ttlTimeouts.get(key) as NodeJS.Timeout)
		}
		if (ttlSec) {
			this.ttlTimeouts.set(key, setTimeout(() => this.data.delete(key), ttlSec * 1000));
		}
	}
}
