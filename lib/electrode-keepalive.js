"use strict";

/* eslint-disable no-magic-numbers, max-statements */

const Agent = require("../agentkeepalive");
const HttpsAgent = Agent.HttpsAgent;

const dns = require("dns");

const FAMILY_FOUR = 4;
const FAMILY_SIX = 6;
const FIVE_SECONDS_IN_MS = 5000;

const CHECK_EXPIRED_DNS_INTERVAL = 5 * 1000;

const freeSocketKeepAliveTimeout = 30 * 1000;
const workingSocketTimeout = freeSocketKeepAliveTimeout * 2;

let DNS_CACHE = {};

class ElectrodeKeepAlive {
  constructor(opts) {
    opts = opts || {};
    this.expiry = opts.expiry || FIVE_SECONDS_IN_MS;
    this._https = Boolean(opts.https);

    opts = Object.assign(
      {
        keepAlive: true,
        freeSocketKeepAliveTimeout,
        timeout: workingSocketTimeout
      },
      opts,
      { expiry: undefined, https: undefined }
    );
    this._agent = this._https ? new HttpsAgent(opts) : new Agent(opts);
    this._agent.getName = options => this.getName(options);
    this._agent.getNameAsync = (options, cb) => this.getNameAsync(options, cb);
  }

  get agent() {
    return this._agent;
  }

  get https() {
    return this._https;
  }

  makeAgentKey(name, options) {
    name += ":";
    if (options.port) {
      name += options.port;
    }

    name += ":";
    if (options.localAddress) {
      name += options.localAddress;
    }

    // Pacify parallel/test-http-agent-getname by only appending
    // the ':' when options.family is set.
    if (options.family === FAMILY_FOUR || options.family === FAMILY_SIX) {
      name += `:${options.family}`;
    }

    options._agentKey = name;

    return name;
  }

  lookupDnsCache(options) {
    const entry = DNS_CACHE[options.host];
    let name;

    if (entry && Date.now() < entry.expiry) {
      name = entry.ip;
      options.host = name; // update options host to real IP to avoid Node lookup again
    }

    return name;
  }

  getNameAsync(options, cb) {
    if (options._agentKey) {
      process.nextTick(() => cb(null, options._agentKey));
      return;
    }
    const name = this.lookupDnsCache(options);

    options._keepIt = true;

    if (!name) {
      this.preLookup(options.host, options, (err, ip) => {
        if (err) {
          options._keepIt = false;
          return cb(null, this.makeAgentKey(options.host, options));
        } else {
          options.host = ip; // update options host to real IP to avoid Node lookup again
          return cb(null, this.makeAgentKey(ip, options));
        }
      });
    } else {
      process.nextTick(() => cb(null, this.makeAgentKey(name, options)));
    }
  }

  getName(options) {
    if (options._agentKey) return options._agentKey;
    let name = this.lookupDnsCache(options);

    if (!name) {
      name = options.host;
      this.preLookup(options.host, options);
      options._keepIt = false;
    } else {
      options._keepIt = true;
    }

    return this.makeAgentKey(name, options);
  }

  preLookup(host, options, cb) {
    if (!cb && typeof options === "function") {
      cb = options;
      options = {};
    }

    //
    // Follow how Node's net module does lookupAndConnect
    // https://github.com/nodejs/node/blob/94a3aef6d5814b5c82d13b181ddd195f420b8e6f/lib/net.js#L978-L991
    //
    // This helps avoid double lookup in the socket layer by using a global dns cache module like
    // https://github.com/yahoo/dnscache which takes lookup options into consideration when creating
    // the cache key.
    //

    const family = options.family;
    const hints = options.hints || 0;
    const dnsopts = { family, hints };

    if (family !== FAMILY_FOUR && family !== FAMILY_SIX && hints === 0) {
      dnsopts.hints = dns.ADDRCONFIG;
    }

    if (!cb) cb = x => x;

    dns.lookup(host, dnsopts, (err, ip, addressType) => {
      if (err) {
        return cb(err);
      }

      DNS_CACHE[host] = {
        expiry: Date.now() + this.expiry + 50,
        ip,
        addressType
      };

      return cb(null, ip);
    });

    ElectrodeKeepAlive.deleteExpiredDnsCache();
  }

  static get DNS_CACHE() {
    return DNS_CACHE;
  }

  static clearDnsCache() {
    DNS_CACHE = {};
  }

  static deleteExpiredDnsCache() {
    const now = Date.now();

    const elapsed = now - ElectrodeKeepAlive.lastCheckDnsExpireTime;
    if (elapsed < ElectrodeKeepAlive.checkExpiredDnsInterval) return;

    ElectrodeKeepAlive.lastCheckDnsExpireTime = now;

    for (const key in DNS_CACHE) {
      const entry = DNS_CACHE[key];
      if (now > entry.expiry) {
        delete DNS_CACHE[key];
      }
    }
  }
}

ElectrodeKeepAlive.checkExpiredDnsInterval = CHECK_EXPIRED_DNS_INTERVAL;
ElectrodeKeepAlive.lastCheckDnsExpireTime = Date.now();

module.exports = ElectrodeKeepAlive;
