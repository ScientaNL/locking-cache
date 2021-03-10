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

## Quickstart
```ts
import { LockAndCache } from "@scienta/locking-cache";

const cache = new LockAndCache();

async function computeStockQuote(symbol: string) {
  // Fetch stock price from remote source, cache for one minute.
  //
  // Calling this multiple times in parallel will only run it once the cache key
  // is based on the function name and arguments.
  return 100;
}
const stockQuote = cache.wrap({ ttl: 60 }, computeStockQuote);

// If you forget this, your process will never exit.
cache.close();
```

