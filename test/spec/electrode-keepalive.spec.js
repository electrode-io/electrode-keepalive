"use strict";

const ElectrodeKeepAlive = require("../../lib/electrode-keepalive");
const sa = require("superagent");
const sinon = require("sinon");

describe("electrode-keepalive", () => {
  it("should expose the underlying agent", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    const agent = keepAlive.agent;

    expect(agent).to.exist;
  });

  it("agent should fetch requests", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    const httpAgent = keepAlive.agent;

    const request = sa.get("www.google.com");
    request.agent(httpAgent);

    return request;
  });

  it("should provide a preLookup function", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    expect(keepAlive.preLookup).to.be.a("function");
  });

  it("should lookup hosts and populate dnsCache", (done) => {
    const keepAlive = new ElectrodeKeepAlive({});

    keepAlive.preLookup("www.google.com", (err, ip) => {
      expect(err).to.be.null;
      expect(ip).to.exist;
      expect(keepAlive.getName({host: "www.google.com"})).to.contain(ip);
      done();
    });
  });

  it("should return cached dns entry", () => {
    const expiry = 5000;
    const keepAlive = new ElectrodeKeepAlive({expiry: expiry});

    ElectrodeKeepAlive.DNS_CACHE.foo = {ip: "bar", expiry: Date.now() + expiry};
    expect(keepAlive.agent.getName({host: "foo"})).to.equal("bar::");
  });

  it("should resolve dns when entry doesn't exist", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    keepAlive.preLookup = sinon.stub();

    const name = keepAlive.agent.getName({host: "foo2"});
    expect(name).to.equal("foo2::");
    expect(keepAlive.preLookup).to.have.been.calledWith("foo2");
  });

});
