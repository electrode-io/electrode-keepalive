"use strict";
/* eslint-disable no-magic-numbers */

const ElectrodeKeepAlive = require("../../lib/electrode-keepalive");
const sa = require("superagent");
const sinon = require("sinon");
const expect = require("chai").expect;
const Promise = require("bluebird");
const dns = require("dns");

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

  it("should lookup hosts and populate dnsCache", done => {
    const keepAlive = new ElectrodeKeepAlive({});

    keepAlive.preLookup("www.google.com", (err, ip) => {
      expect(err).to.be.null;
      expect(ip).to.exist;
      expect(keepAlive.getName({ host: "www.google.com" })).to.contain(ip);
      done();
    });
  });

  const testKeepAlive = https => {
    const lookupSpy = sinon.spy(dns, "lookup");
    const keepAlive = new ElectrodeKeepAlive({
      https,
      keepAlive: true,
      keepAliveMsecs: 30000, // socket send keep alive ping every 30 secs
      maxSockets: 100,
      maxFreeSockets: 10
    });
    expect(Boolean(keepAlive.https)).to.equal(Boolean(https));
    ElectrodeKeepAlive.clearDnsCache();
    expect(ElectrodeKeepAlive.DNS_CACHE).to.be.empty;
    const host = "www.google.com";
    return new Promise((resolve, reject) => {
      keepAlive.preLookup(host, err => {
        if (err) {
          return reject(err);
        }
        const url = `${https ? "https" : "http"}://${host}`;
        return resolve(
          sa
            .get(url)
            .agent(keepAlive.agent)
            .then(() => {
              const agent = keepAlive.agent;
              const name = keepAlive.getName({ host, port: https ? 443 : 80 });
              const free = agent.freeSockets[name];
              expect(free).to.be.array;
            })
        );
      });
    }).finally(() => {
      const entry = ElectrodeKeepAlive.DNS_CACHE[host];
      ElectrodeKeepAlive.clearDnsCache();
      expect(lookupSpy.callCount).to.equal(2);
      expect(lookupSpy.args[0][0]).to.equal(host);
      expect(lookupSpy.args[1][0]).to.equal(entry.ip);
      lookupSpy.restore();
    });
  };

  it("should load with https", () => {
    return testKeepAlive(true);
  });

  it("should load with http", () => {
    return testKeepAlive(false);
  });

  it("should return cached dns entry", () => {
    const expiry = 5000;
    const keepAlive = new ElectrodeKeepAlive({ expiry: expiry });

    ElectrodeKeepAlive.DNS_CACHE.foo = { ip: "bar", expiry: Date.now() + expiry };
    expect(keepAlive.agent.getName({ host: "foo" })).to.equal("bar::");
  });

  it("should resolve dns when entry doesn't exist", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    keepAlive.preLookup = sinon.stub();

    const name = keepAlive.agent.getName({ host: "foo2" });
    expect(name).to.equal("foo2::");
    expect(keepAlive.preLookup).to.have.been.calledWith("foo2");
  });

  it("getName should avoid expired entries", done => {
    ElectrodeKeepAlive.clearDnsCache();
    const dc = ElectrodeKeepAlive.DNS_CACHE;
    dc.test = { expiry: Date.now() + 10, ip: "1234" };
    setTimeout(() => {
      const eka = new ElectrodeKeepAlive();
      const preLookup = sinon.stub(eka, "preLookup");
      const options = { host: "test" };
      eka.getName(options);
      expect(options.host).to.equal("test");
      expect(preLookup.callCount).to.equal(1);
      preLookup.restore();
      done();
    }, 20);
  });

  it("getName should add localAddress and family", () => {
    ElectrodeKeepAlive.clearDnsCache();
    const dc = ElectrodeKeepAlive.DNS_CACHE;
    dc.test = { expiry: Date.now() + 5000, ip: "1234" };
    const eka = new ElectrodeKeepAlive();
    const preLookup = sinon.stub(eka, "preLookup");
    const options = { host: "test", localAddress: "foo", family: 6 };
    const name = eka.getName(options);
    expect(name).to.equal("1234::foo:6");
    expect(options.host).to.equal("1234");
    expect(preLookup.callCount).to.equal(0);
    preLookup.restore();
  });

  it("preLookup should handle dns lookup error", () => {
    ElectrodeKeepAlive.clearDnsCache();
    const eka = new ElectrodeKeepAlive();
    const preLookup = sinon.stub(dns, "lookup", (host, opts, cb) => {
      cb(new Error("bummer"));
    });
    let error;
    eka.preLookup("test", { hints: 1 }, err => {
      error = err;
    });
    expect(error.message).to.equal("bummer");
    preLookup.restore();
  });

  it("should init expired DNS checker", done => {
    clearInterval(ElectrodeKeepAlive.expiredDnsChecker);
    ElectrodeKeepAlive.expiredDnsChecker = undefined;
    ElectrodeKeepAlive.clearDnsCache();
    const dc = ElectrodeKeepAlive.DNS_CACHE;
    const now = Date.now();
    dc.a = { expiry: now + 5000 };
    dc.d1 = { expiry: now };
    dc.d2 = { expiry: now };
    dc.x1 = { expiry: now + 1000 };
    dc.d3 = { expiry: now };
    dc.d4 = { expiry: now };
    dc.x2 = { expiry: now + 2000 };
    const eka = new ElectrodeKeepAlive({ checkExpiredDnsInterval: 20 }); // eslint-disable-line
    setTimeout(() => {
      expect(dc).to.have.keys("a", "x1", "x2");
      done();
    }, 30);
  });
});
