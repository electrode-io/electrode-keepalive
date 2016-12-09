"use strict";

const httpAgent = require("../../lib/index");
const sinon = require("sinon");

describe("index", () => {
  it("should export a function", () => {
    expect(httpAgent).to.be.a("function");
  });

  describe("httpAgent", () => {
    it("should provide a preLookup function", () => {
      const agent = httpAgent({});
      expect(agent.preLookup).to.be.a("function");
    });

    it("should lookup hosts and populate dnsCache", (done) => {
      const agent = httpAgent({});

      agent.preLookup("www.google.com", (err, address) => {
        expect(err).to.be.null;
        expect(address).to.exist;
        expect(agent.dnsCache["www.google.com"].address).to.equal(address);
        done();
      });
    });

    it("should return cached dns entry", () => {
      const expiry = 5000;
      const agent = httpAgent({expiry: expiry});

      agent.dnsCache.foo = {address: "bar", expiry: Date.now() + expiry};
      expect(agent.getName({host: "foo"})).to.equal("bar::");
    });

    it("should resolve dns when entry doesn't exist", () => {
      const agent = httpAgent({});
      agent.preLookup = sinon.stub();

      const name = agent.getName({host: "foo"});
      expect(name).to.equal("foo::");
      expect(agent.preLookup).to.have.been.calledWith("foo");
    });
  });
});
