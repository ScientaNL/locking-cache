# locking-cache
Cache values and lock while resolving the value to cache.
Lots of caching libraries do not lock the process fetching the value to be cached.
That means that multiple resource-intensive processes, that you want 2 cache, can be running
computing a value at the same time.

This library combines locking with caching and makes sure only one process computing
the same cacheable value will run at the same time.

### Not opinionated
This library is in essence a wrapper for different cache-storage and locking mechanisms.
It does not force you to use a specific backend for storage, or a complex distributed locking library.
It does come with some ready-to-use storage and locking implementations.

### Promise-based
Locking and caching works with promises. In this way it is easy to use with async/await.

## Quickstart
There are pre-made storage and locking implementations for single-threaded and multi-threaded caching.

### Single-threaded in-memory locking and caching
```ts
import { LockingCache } from "@scienta/locking-cache";

// Expensive (async) function requesting an access token
const requestTokenMock = () => {
  // Fetch api access token (async), cache for 10 minutes.
  //
  // Calling this multiple times in parallel will only run it once.
  // the cache key is based on the function name and arguments.
  return Promise.resolve({
    value: 'fea80f2db003d4ebc4536023814aa885', //access token
    expiresInSec: 60 * 10 //10 minutes
  });
}
const cache = new LockingCache<string>();
cache.getValue(clientId, requestTokenMock).then(result => {
  // Use cached token for requesting resources
});
```

### Multi-threaded distributed locking and caching with redis (async/await)
```ts
import {IoRedisStorage, LockingCache, RedisLocker} from "@scienta/locking-cache";
import * as IORedis from "ioredis";
import * as Redlock from "redlock";

const ioRedis = new IORedis();
const cache = new LockingCache<string>(
  new IoRedisStorage(ioRedis, { namespace: 'cache' }), // cache storage in redis
  new RedisLocker(new Redlock(ioRedis)) // distributed locking in redis
);

const result = await cache.getValue(clientId, async () => {
  return {
    value: 'fea80f2db003d4ebc4536023814aa885', //access token
    expiresInSec: 60 * 10 //10 minutes
  };
});
```

## Flow of execution
1. returns value if cached
2. acquires a lock, using the cacheKey
3. returns cached value if it was computed while waiting for a lock
4. compute and cache the value
5. release the lock
6. return the value

## Errors
There are a number of errors that can come up when caching:

```ts
export enum CacheErrorEvents {
  resolveError = 'resolveError',
  storeGetError = 'storeGetError',
  storeSetError = 'storeSetError',
  lockError = 'lockError',
  unlockError = 'unlockError'
}
```

If an error occurs, most of the time it will result in a rejected promise from `getValue()`:

```ts
const cache = new LockingCache<string>();
try {
  const result = await cache.getValue(clientId, requestTokenMock);
} catch (error) {
  // handle resolveError|storeGetError|storeSetError(|lockError)
}
```

The `unlockError` is an exception (it does not get thrown) and the `lockError` can be thrown optionally
by setting `cacheOnLockError` of the `LockingCache` to `false`;

Still there is a way to listen to errors, because the `LockingCache` also emits them:
```ts
const cache = new LockingCache<string>();
cache.on('unlockError', (error) => {
  //handle unlockError
});
cache.getValue(clientId, requestTokenMock).then(result => {
  // Use cached token for requesting resources
}).catch((error) => {
  // handle resolveError|storeGetError|storeSetError(|lockError)
});
```

## Contributing
If you want to contribute, please do so. A `docker-compose.yml` file is added to make development easy.

### Developing with docker-compose
To start development within the defined container, just use docker-compose:
```bash
docker-compose up -d
docker exec -ti locking-cache bash
```

### Testing and linting without docker-compose
To quickly run tests and linting from a docker container, you can also use docker directly:
```bash
docker run -it -w="/app" -v ${PWD}:/app node:14-slim /bin/bash -c "npm install && npm run test && npm run lint"
```
