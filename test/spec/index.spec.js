"use strict";

const httpAgent = require("../../lib/index");

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
        expect(agent.dnsCache["www.google.com"]).to.equal(address);
        done();
      });
    });
  });
});
