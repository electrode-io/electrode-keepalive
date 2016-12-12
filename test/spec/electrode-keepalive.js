"use strict";

const ElectrodeKeepAlive = require("../../lib/electrode-keepalive");
const sa = require("superagent");

describe("electrode-keepalive", () => {
  it("should expose the underlying agent", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    const agent = keepAlive.getAgent();

    expect(agent).to.exist;
  });

  it("agent should fetch requests", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    const httpAgent = keepAlive.getAgent();

    const request = sa.get("www.google.com");
    request.agent(httpAgent);

    return request;
  });
});
