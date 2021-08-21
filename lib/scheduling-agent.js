"use strict";

/* eslint-disable no-magic-numbers, max-params */

const assert = require("assert");
const AgentKeepAlive = require("agentkeepalive");

const { KEEP_IT } = require("./symbols");

/**
 * addRequest mixin for the Http or Https Agent
 *
 * @param {*} req request
 * @param {*} options options
 * @param {*} port port number
 * @param {*} localAddress local address
 *
 * @returns {*} nothing
 */
function addRequest(req, options, port, localAddress) {
  options = { ...options };
  /* eslint-disable-next-line no-invalid-this */
  this.getNameAsync(options, () => {
    req.shouldKeepAlive = options[KEEP_IT];
    /* eslint-disable-next-line no-invalid-this */
    const r = this._addRequest(req, options, port, localAddress);
    assert(r === undefined);
  });
}

class HttpAgent extends AgentKeepAlive {
  constructor(options) {
    super(options);
  }

  _addRequest(...args) {
    return super.addRequest(...args);
  }

  get hasScheduling() {
    return true;
  }
}

class HttpsAgent extends AgentKeepAlive.HttpsAgent {
  constructor(options) {
    super(options);
  }

  _addRequest(...args) {
    return super.addRequest(...args);
  }

  get hasScheduling() {
    return true;
  }
  // other methods that use getName
  // createSocket
  // removeSocket
  // agent.on("free") handler
}

HttpAgent.prototype.addRequest = addRequest;
HttpsAgent.prototype.addRequest = addRequest;

exports.checkScheduling = (major, minor) => {
  // starting at version 12.20.0, node.js added a scheduling option
  // https://github.com/nodejs/node/commit/cce464513ece26a4d1dc8e14f5cfd2cb0a0c55ab
  // https://github.com/nodejs/node/blob/v12.20.0/lib/_http_agent.js
  if (major < 12 || (major === 12 && minor < 20)) {
    return false;
  }

  return true;
};

exports.HttpAgent = HttpAgent;
exports.HttpsAgent = HttpsAgent;

exports.HAS_SCHEDULING = (() => {
  const p = process.versions.node.split(".");
  const major = parseInt(p[0]);
  const minor = parseInt(p[1]);
  return exports.checkScheduling(major, minor);
})();
