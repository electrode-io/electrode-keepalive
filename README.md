# electrode-keepalive

`electrode-keepalive` provides an HttpAgent capable of maintaining available sockets using IP address instead of hostname lookup. This allows for graceful handling of dns changes/failover when changes occur in routing configuration. This is particularly important when using keep-alive enabled connections.  It resolves part of the problems in this [issue](https://github.com/nodejs/node/issues/6713)

It also uses the patched [agentkeepalive] to support destorying kept alive sockets within a timeout.

### Usage

```js
const ElectrodeKeepAlive = require("electrode-keepalive");
const keepAlive = new ElectrodeKeepAlive();
request({url: "http://www.google.com", agent: keepAlive.agent});
```

# APIs

## Properties

### [agent](#agent)

`instance.agent` - Read only instance property to access the http/https agent.

### [https](#https)

`instance.https` - Read only instance property.  If true, then the agent is an https agent.

### [static DNS_CACHE](#static-dns_cache)

`ElectrodeKeepAlive.DNS_CACHE` - Internal DNS cache mapping object.

## Methods

### [constructor](#constructor)

`constructor(options)`

Creates an instance of `ElectrodeKeepAlive`.

-   `options` should be the default http agent [settings] that are passed through to the underlying implementation. Additionally the following options are supported:

    -   `https` - If true, then creates an https Agent.
    -   `expiry` - The duration (in milliseconds) that ip entries in the DNS mapping will be refreshed. **Default**: `5000ms`

    -   `checkExpiredDnsInterval` - interval in milliseconds to check and delete expired DNS cache entries.  **Default**: `10000ms`

    -   Since this uses [agentkeepalive], you can also pass in any options it supports.
    -   The defaults for the following two options are set if you didn't specify them:
        -   `freeSocketKeepAliveTimeout` - `30000ms`
        -   `timeout` - `60000ms`

### [preLookup](#prelookup)

`instance.preLookup(host, options, callback)`

This method is used to do DNS lookup to translate host name into IP for tracking free sockets.
It will also populate `ElectrodeKeepAlive` DNS cache.

The arguments matches Node dns module lookup.

### [clearDnsCache](#cleardnscache)

`instance.clearDnsCache()` - Wipes out current DNS mapping.

### [getName](#getname)

`instance.getName(options)`

The internal method to override http agent's default `getName`.  Not intended for public use.

[settings]: https://nodejs.org/api/http.html#http_new_agent_options

[agentkeepalive]: https://github.com/node-modules/agentkeepalive

### [getNameAsync](#getnameasync)

`instance.getNameAsync(options, callback)`

Async version of [getName](#getname).
