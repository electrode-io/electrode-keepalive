"use strict";

const agent = require("./electrode-agent");

function ElectrodeKeepAlive(opts) {
  this.agent = agent(opts);
}

ElectrodeKeepAlive.prototype.getAgent = function () {
  return this.agent;
};

module.exports = ElectrodeKeepAlive;
