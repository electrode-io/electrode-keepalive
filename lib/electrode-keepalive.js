"use strict";

/* eslint-disable no-magic-numbers, max-statements, prefer-template */

const Agent = require("../agentkeepalive");
const HttpsAgent = Agent.HttpsAgent;
const { KEEP_IT } = require("./symbols");
const SchedulingAgent = require("./scheduling-agent");

const dns = require("dns");

const FAMILY_FOUR = 4;
const FAMILY_SIX = 6;
const FIVE_SECONDS_IN_MS = 5000;

const CHECK_EXPIRED_DNS_INTERVAL = 5 * 1000;

const freeSocketKeepAliveTimeout = 30 * 1000;
const workingSocketTimeout = freeSocketKeepAliveTimeout * 2;

let DNS_CACHE = {};

class ElectrodeKeepAlive {
  constructor(opts, hasScheduling = SchedulingAgent.HAS_SCHEDULING) {
    opts = opts || {};
    this.expiry = opts.expiry || FIVE_SECONDS_IN_MS;
    this._https = Boolean(opts.https);

    opts = Object.assign(
      {
        keepAlive: true,
        timeout: workingSocketTimeout
      },
      opts,
      { expiry: undefined, https: undefined }
    );

    if (hasScheduling) {
      opts.freeSocketTimeout = freeSocketKeepAliveTimeout;
      opts.scheduling = opts.scheduling || "lifo";
      this._agent = this._https
        ? new SchedulingAgent.HttpsAgent(opts)
        : new SchedulingAgent.HttpAgent(opts);
    } else {
      opts.freeSocketKeepAliveTimeout = freeSocketKeepAliveTimeout;
      this._agent = this._https ? new HttpsAgent(opts) : new Agent(opts);
    }

    this._agent.getName = options => this.getName(options);
    this._agent.getNameAsync = (options, cb) => this.getNameAsync(options, cb);
  }

  get agent() {
    return this._agent;
  }

  get https() {
    return this._https;
  }

  makeAgentKey(host, ip, options) {
    let key = host + "+ip:" + ip;
    if (options.port) {
      key += "+port:" + options.port;
    }

    if (options.localAddress) {
      key += "+localAddress:" + options.localAddress;
    }

    // Pacify parallel/test-http-agent-getname by only appending
    // the ':' when options.family is set.
    if (options.family === FAMILY_FOUR || options.family === FAMILY_SIX) {
      key += "+family:" + options.family;
    }

    options._agentKey = key;

    return key;
  }

  lookupDnsCache(options) {
    const entry = DNS_CACHE[options.host];

    if (entry && Date.now() < entry.expiry) {
      // update options host to real IP to avoid Node doing DNS lookup again
      options.host = entry.ip;
      return entry;
    } else {
      return false;
    }
  }

  getNameAsync(options, cb) {
    if (options._agentKey) {
      if (options[KEEP_IT] === undefined) {
        options[KEEP_IT] = true;
      }
      process.nextTick(() => cb(null, options._agentKey));
      return;
    }

    const cachedEntry = this.lookupDnsCache(options);

    options[KEEP_IT] = true;

    if (!cachedEntry) {
      this.preLookup(options.host, options, (err, ip, entry) => {
        if (err) {
          options[KEEP_IT] = false;
          return cb(null, this.makeAgentKey(options.host, "_none_", options));
        } else {
          // update options host to real IP to avoid Node doing DNS lookup again
          options.host = ip;
          return cb(null, this.makeAgentKey(entry.host, ip, options));
        }
      });
    } else {
      process.nextTick(() =>
        cb(null, this.makeAgentKey(cachedEntry.host, cachedEntry.ip, options))
      );
    }
  }

  getName(options) {
    if (options._agentKey) {
      return options._agentKey;
    }
    const cachedEntry = this.lookupDnsCache(options);

    if (!cachedEntry) {
      this.preLookup(options.host, options);
      options[KEEP_IT] = false;
      return this.makeAgentKey(options.host, "_none_", options);
    } else {
      options[KEEP_IT] = true;
      return this.makeAgentKey(cachedEntry.host, cachedEntry.ip, options);
    }
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
    const dnsOpts = { family, hints };

    if (family !== FAMILY_FOUR && family !== FAMILY_SIX && hints === 0) {
      dnsOpts.hints = dns.ADDRCONFIG;
    }

    if (!cb) cb = x => x;

    dns.lookup(host, dnsOpts, (err, ip, addressType) => {
      if (err) {
        return cb(err);
      }

      const entry = {
        expiry: Date.now() + this.expiry + 50,
        ip,
        host,
        addressType
      };
      DNS_CACHE[host] = entry;

      return cb(null, ip, entry);
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
