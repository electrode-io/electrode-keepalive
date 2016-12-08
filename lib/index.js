"use strict";

const http = require("http");
const dns = require("dns");

const FAMILY_FOUR = 4;
const FAMILY_SIX = 6;

const createAgent = (opts) => {
  const httpAgent = new http.Agent(opts);

  httpAgent.dnsCache = {};
  httpAgent.getName = function (options) {
    let name = httpAgent.dnsCache[options.host] || "localhost";

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

  httpAgent.preLookup = function (host, cb) {
    dns.lookup(host, function (err, address, family) { //eslint-disable-line
      if (err) {
        return cb(err);
      }

      httpAgent.dnsCache[host] = address;
      cb(null, address);
    });
  };

  return httpAgent;
};


module.exports = createAgent;
