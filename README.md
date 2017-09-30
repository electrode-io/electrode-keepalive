# electrode-keepalive

`electrode-keepalive` provides an HttpAgent capable of maintaining and tracking available sockets using IP address instead of hostname. This allows for graceful handling of DNS changes or failover when routing configuration is updated. This is particularly important when using keep-alive enabled connections.  It resolves part of the problems in this [issue](https://github.com/nodejs/node/issues/6713)

It also uses the patched [agentkeepalive] to support destorying kept alive sockets within a timeout.

The big changes from [agentkeepalive] are:

1.  Do DNS lookup and use IP address as key to track sockets.
2.  Use LIFO instead of FIFO when reusing free sockets.  This avoids a long list of free sockets created after a burst of traffic to stay around for a long time due to continuous traffic that would cycle through them and avoid them getting expired.

### Usage

```js
const ElectrodeKeepAlive = require("electrode-keepalive");
const keepAlive = new ElectrodeKeepAlive();
request({url: "http://www.google.com", agent: keepAlive.agent});
```

See [contructor](#constructor) for details on options you can passed.

### Install

```bash
npm install electrode-keepalive --save
```

# APIs

## Properties

### [agent](#agent)

`instance.agent` - Read only instance property to access the http/https agent.

### [https](#https)

`instance.https` - Read only instance property.  If true, then the agent is an https agent.

### [static DNS_CACHE](#static-dns_cache)

`ElectrodeKeepAlive.DNS_CACHE` - Internal DNS cache mapping object.

### [static checkExpiredDnsInterval](#static-checkexpireddnsinterval)

`ElectrodeKeepAlive.checkExpiredDnsInterval` - Interval in milliseconds to check and delete expired DNS cache entries.  **Default**: `5000ms`

This is not a regular timer interval.  The check only occurs when [preLookup](#prelookup) is called.

## Static Methods

### [static clearDnsCache](#static-cleardnscache)

`ElectrodeKeepAlive.clearDnsCache()` - Wipes out current DNS mapping.

### [static deleteExpiredDnsCache](#static-deleteexpireddnscache)

`ElectrodeKeepAlive.deleteExpiredDnsCache()` - delete any DNS cache entry that's expired.

## Methods

### [constructor](#constructor)

`constructor(options)`

Creates an instance of `ElectrodeKeepAlive`.

-   `options` should be the default http agent [settings] that are passed through to the underlying implementation. Additionally the following options are supported:

    -   `https` - If true, then creates an https Agent.
    -   `expiry` - The duration (in milliseconds) that ip entries in the DNS mapping will be refreshed. **Default**: `5000ms`

-   Since this uses [agentkeepalive], you can also pass in any options it supports.

    -   The defaults for the following two options are set if you didn't specify them:
        -   `freeSocketKeepAliveTimeout` - `30000ms`
        -   `timeout` - `60000ms`

-   `keepAlive` - This is always default to `true` by `ElectrodeKeepAlive`.

### [preLookup](#prelookup)

`instance.preLookup(host, options, callback)`

This method is used to do DNS lookup to translate host name into IP for tracking free sockets.
It will also populate `ElectrodeKeepAlive` DNS cache.

The arguments matches Node dns module lookup.

### [getName](#getname)

`instance.getName(options)`

The internal method to override http agent's default `getName`.  Not intended for public use.

[settings]: https://nodejs.org/api/http.html#http_new_agent_options

[agentkeepalive]: https://github.com/node-modules/agentkeepalive

### [getNameAsync](#getnameasync)

`instance.getNameAsync(options, callback)`

Async version of [getName](#getname).
