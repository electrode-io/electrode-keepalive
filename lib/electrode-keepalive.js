"use strict";

const http = require("http");
const dns = require("dns");

const FAMILY_FOUR = 4;
const FAMILY_SIX = 6;
const FIVE_SECONDS_IN_MS = 5000;

const DNS_CACHE = {};

class ElectrodeKeepAlive {
  constructor(opts) {
    this.expiry = opts.expiry || FIVE_SECONDS_IN_MS;
    this._agent = new http.Agent(opts);
    this._agent.getName = (options) => this.getName(options);
  }

  get agent() {
    return this._agent;
  }

  getName(options) {
    const entry = DNS_CACHE[options.host];
    let name = entry ? entry.ip : options.host;

    if (!entry || Date.now() > entry.expiry) {
      this.preLookup(options.host, options);
    }

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

    return name;
  }

  preLookup(host, options, cb) {
    if (!cb && typeof (options) === "function") {
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
    const dnsopts = {family, hints};

    if (family !== FAMILY_FOUR && family !== FAMILY_SIX && hints === 0) {
      dnsopts.hints = dns.ADDRCONFIG;
    }

    dns.lookup(host, dnsopts, (err, ip, addressType) => {
      if (err) {
        return cb ? cb(err) : err;
      }

      DNS_CACHE[host] = {
        expiry: Date.now() + this.expiry,
        ip,
        addressType
      };

      return cb ? cb(null, ip) : {};
    });
  }

  static get DNS_CACHE() {
    return DNS_CACHE;
  }
}

module.exports = ElectrodeKeepAlive;
