"use strict";

const http = require("http");

const FAMILY_FOUR = 4;
const FAMILY_SIX = 6;

const getName = function (options) {
  let name = options.host || "localhost";
  // console.log("options are: ", options.host);
  //name = "10.247.168.11";

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


const createAgent = (opts) => {
  const httpAgent = new http.Agent(opts);
  //const httpsAgent = new https.Agent(opts);

  httpAgent.getName = getName;
  return httpAgent;
};


module.exports = createAgent;
