import * as IORedis from "ioredis";
import {TokenStorage} from "./token-storage.interface";

interface RedisStorageOptions<T> {
	namespace?: string;
	deserializer: (data: string) => Promise<T>;
	serializer: (data: T) => Promise<string>;
}

export class IoRedisStorage<T> implements TokenStorage<T> {

	protected options: RedisStorageOptions<T> = {
		namespace: undefined,
		deserializer: (data) => Promise.resolve(JSON.parse(data)),
		serializer: (data) => Promise.resolve(JSON.stringify(data))
	};

	constructor(private readonly ioRedis: IORedis.Redis, options: Partial<RedisStorageOptions<T>> = {}) {
		Object.assign(this.options, options);
	}

	public get(key: string | number) {
		const dataKey: string = this.nsKey(key + '');
		return this.ioRedis.get(dataKey)
			.then(response => {
				if (response == null) {
					return response;
				}
				return this.options.deserializer(response as string);
			});
	}

	public set(key: string | number, value?: T, ttlSec?: number) {
		const dataKey: string = this.nsKey(key + '');

		if (value === undefined) {
			return this.ioRedis.del(dataKey);
		}

		return this.options.serializer(value).then(data => {
			return ttlSec ? this.ioRedis.setex(dataKey, ttlSec, data) : this.ioRedis.set(dataKey, data);
		});
	}

	private nsKey(key: string) {
		if (this.options.namespace) {
			key = `${this.options.namespace}:${key}`;
		}
		return key;
	}
}
