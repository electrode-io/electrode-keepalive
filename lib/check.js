"use strict";

/* eslint-disable no-magic-numbers */

exports.checkScheduling = (major, minor) => {
  // starting at version 12.20.0, node.js added a scheduling option
  // https://github.com/nodejs/node/commit/cce464513ece26a4d1dc8e14f5cfd2cb0a0c55ab
  // https://github.com/nodejs/node/blob/v12.20.0/lib/_http_agent.js
  if (major < 12 || (major === 12 && minor < 20)) {
    return false;
  }

  return true;
};

exports.HAS_SCHEDULING = (() => {
  const p = process.versions.node.split(".");
  const major = parseInt(p[0]);
  const minor = parseInt(p[1]);
  return exports.checkScheduling(major, minor);
})();
