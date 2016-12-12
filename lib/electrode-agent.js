"use strict";

const http = require("http");
const dns = require("dns");

const FAMILY_FOUR = 4;
const FAMILY_SIX = 6;

const FIVE_SECONDS_IN_MS = 5000;

const createAgent = (opts) => {
  const httpAgent = new http.Agent(opts);
  const expiry = opts.expiry || FIVE_SECONDS_IN_MS;

  httpAgent.dnsCache = {};
  httpAgent.getName = (options) => {
    const entry = httpAgent.dnsCache[options.host];
    let name = entry ? entry.address : options.host;

    if (!entry || Date.now() > entry.expiry) {
      httpAgent.preLookup(options.host);
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
  };

  httpAgent.preLookup = (host, options, cb) => {
    if (!cb && typeof (options) === "function") {
      cb = options;
      options = {};
    }

    dns.lookup(host, options, (err, address) => {
      if (err) {
        return cb ? cb(err) : err;
      }

      httpAgent.dnsCache[host] = {
        expiry: Date.now() + expiry,
        address: address
      };

      return cb ? cb(null, address) : {};
    });
  };

  return httpAgent;
};


module.exports = createAgent;
