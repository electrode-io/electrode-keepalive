"use strict";

const http = require("http");

/**
 * Check to see if a http agent has the scheduling feature
 *
 * @param {*} Agent - http agent - default to http.Agent
 * @returns {boolean} has scheduling feature flag
 */
exports.checkScheduling = Agent => {
  Agent = Agent || http.Agent;
  // starting at version 12.20.0, node.js added a scheduling option
  // https://github.com/nodejs/node/commit/cce464513ece26a4d1dc8e14f5cfd2cb0a0c55ab
  // https://github.com/nodejs/node/blob/v12.20.0/lib/_http_agent.js

  try {
    /* eslint-disable no-new */
    new Agent({ scheduling: "bad-type" });
    return false;
  } catch (err) {
    return err instanceof TypeError;
  }
};

exports.HAS_SCHEDULING = exports.checkScheduling();
