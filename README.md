# electrode-keepalive

`electrode-keepalive` provides an HttpAgent capable of maintaining available sockets using IP address instead of hostname lookup. This allows for graceful handling of dns changes/failover when changes occur in routing configuration. This is particularly important when using keep-alive enabled connections.

It resolves part of the problems in this [issue](https://github.com/nodejs/node/issues/6713)

### Usage

```js
const ElectrodeKeepAlive = require("electrode-keepalive");

const keepAlive = new ElectrodeKeepAlive(opts);

keepAlive.preLookup("www.google.com", dnsOptions, (err) => {
  request({url: "http://www.google.com", agent: keepAlive.agent});
});

```

> Since this module works by overriding `http.Agent`'s synchronous `getName` method to return the IP instead of hostname, it has to use a pre-populated DNS mapping.  Before the mapping is populated, it can't use IP.  To avoid that in your first request, you should always call the `preLookup` method first.

# APIs

## Properties

### [agent](#agent)

`instance.agent` - Read only instance property to access the http agent.

### [static DNS_CACHE](#static-dns_cache)

`ElectrodeKeepAlive.DNS_CACHE` - Internal DNS mapping object.

## Methods

### [constructor](#constructor)

`constructor(options)`

Creates an instance of `ElectrodeKeepAlive`.

  - `options` should be the default http agent [settings] that are passed through to the underlying implementation. Additionally the following options are supported:

    - `expiry` - The duration (in milliseconds) that ip entries in the DNS mapping will be refreshed. Default is 5000ms.

### [preLookup](#prelookup)

`preLookup(host, options, callback)`

Allows `ElectrodeKeepAlive` to do a DNS lookup on the host first to populate its DNS mapping.  

The arguments matches Node dns module lookup.

### [getName](#getname)

`getName(options)`

The internal method to override http agent's default `getName`.  Not intended for public use.


[settings]: https://nodejs.org/api/http.html#http_new_agent_options
