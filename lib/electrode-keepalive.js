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
    let name = entry ? entry.address : options.host;

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

    dns.lookup(host, options, (err, address) => {
      if (err) {
        return cb ? cb(err) : err;
      }

      DNS_CACHE[host] = {
        expiry: Date.now() + this.expiry,
        address: address
      };

      return cb ? cb(null, address) : {};
    });
  }

  static get DNS_CACHE() {
    return DNS_CACHE;
  }
}

module.exports = ElectrodeKeepAlive;
