# electrode-keepalive

`electrode-keepalive` provides an HttpAgent capable of maintaining available socketsvusing IP address instead of hostname lookup. This allows for graceful handling of dns changes/failover when changes occur in routing configuration. This is particularly important when using keep-alive enabled connections.

### Usage

```js
const ElectrodeKeepAlive = require("electrode-keepalive");

const keepAlive = new ElectrodeKeepAlive(opts);

request({url: "http://www.google.com", agent: keepAlive.getAgent()});

```

### Options

`ElectrodeKeepAlive` accepts the default http agent [settings](httpagentopts) that are passed through to the underlying implementation. Additionally the following options are supported:

##### `expiry`
The duration (in milliseconds) that ip entries will exist in cache. Default is 5000ms



[httpagentopts]: https://nodejs.org/api/http.html#http_new_agent_options
