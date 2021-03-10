import {TokenStore} from "../src/store/token-store.interface";

export class TokenStoreStub<T> implements TokenStore<T> {

	constructor(
		private readonly data = new Map<string,T>(),
		private readonly ttlTimeouts = new Map<string,NodeJS.Timeout>()
	) {}

	public get(key: string | number) {
		return Promise.resolve(this.data.get(key+''))
	}

	public set(key: string | number, value: T, ttlSec?: number) {
		const dataKey: string = key + '';
		this.data.set(dataKey, value);
		this.setTTL(dataKey, ttlSec);
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
