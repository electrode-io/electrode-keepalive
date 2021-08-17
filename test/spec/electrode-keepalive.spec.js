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

  const testKeepAlive = (opts, noPreLookup) => {
    ElectrodeKeepAlive.clearDnsCache();

    const keepAlive = new ElectrodeKeepAlive(opts);
    const https = Boolean(opts && opts.https);

    expect(Boolean(keepAlive.https)).to.equal(https);
    expect(ElectrodeKeepAlive.DNS_CACHE).to.be.empty;

    const lookupSpy = sinon.spy(dns, "lookup");
    const host = "www.google.com";
    const promise = noPreLookup
      ? Promise.resolve()
      : new Promise((resolve, reject) =>
          keepAlive.preLookup(host, err => (err ? reject(err) : resolve()))
        );
    return promise
      .then(() => {
        const url = `${https ? "https" : "http"}://${host}`;
        return sa
          .get(url)
          .agent(keepAlive.agent)
          .then(() => {
            const agent = keepAlive.agent;
            const name = keepAlive.getName({ host, port: https ? 443 : 80 });
            const free = agent.freeSockets[name];
            expect(free).to.be.array;
          });
      })
      .finally(() => {
        lookupSpy.restore();
        ElectrodeKeepAlive.clearDnsCache();
        expect(lookupSpy.callCount).to.equal(1);
        expect(lookupSpy.args[0][0]).to.equal(host);
      });
  };

  it("should load with https", () => {
    ElectrodeKeepAlive.clearDnsCache();
    return testKeepAlive({ https: true });
  });

  it("should load with http", () => {
    ElectrodeKeepAlive.clearDnsCache();
    return testKeepAlive();
  });

  it("should load with https without pre lookup", () => {
    ElectrodeKeepAlive.clearDnsCache();
    return testKeepAlive({ https: true }, true);
  });

  it("should load with http without pre lookup", () => {
    ElectrodeKeepAlive.clearDnsCache();
    return testKeepAlive({ https: false }, true);
  });

  it("should return cached dns entry", () => {
    const expiry = 5000;
    const keepAlive = new ElectrodeKeepAlive({ expiry: expiry });

    ElectrodeKeepAlive.DNS_CACHE.foo = {
      ip: "bar",
      host: "foo",
      expiry: Date.now() + expiry
    };
    expect(keepAlive.agent.getName({ host: "foo" })).to.equal("foo+ip:bar");
  });

  it("should resolve dns when entry doesn't exist", () => {
    const keepAlive = new ElectrodeKeepAlive({});
    keepAlive.preLookup = sinon.stub();

    const name = keepAlive.agent.getName({ host: "foo2" });
    expect(name).to.equal("foo2+ip:_none_");
    expect(keepAlive.preLookup).to.have.been.calledWith("foo2");
  });

  it("getName should avoid expired entries and call lookup on it", done => {
    ElectrodeKeepAlive.clearDnsCache();
    const dc = ElectrodeKeepAlive.DNS_CACHE;
    dc.test = { expiry: Date.now() + 10, ip: "1234" };
    setTimeout(() => {
      const eka = new ElectrodeKeepAlive();
      const lookup = sinon.stub(dns, "lookup", (host, opts, cb) =>
        cb(null, "99999", "test")
      );
      const options = { host: "test" };
      eka.getName(options);
      lookup.restore();
      expect(lookup.callCount).to.equal(1);
      expect(options.host).to.equal("test");
      expect(dc.test.ip).to.equal("99999");
      expect(dc.test.addressType).to.equal("test");
      expect(dc.test.expiry).to.above(Date.now());
      done();
    }, 20);
  });

  it("getName should add localAddress and family", () => {
    ElectrodeKeepAlive.clearDnsCache();
    const dc = ElectrodeKeepAlive.DNS_CACHE;
    dc.test = { expiry: Date.now() + 5000, ip: "1234", host: "test" };
    const eka = new ElectrodeKeepAlive();
    const preLookup = sinon.stub(eka, "preLookup");
    const options = { host: "test", localAddress: "foo", family: 6 };
    const name = eka.getName(options);
    preLookup.restore();
    expect(name).to.equal("test+ip:1234+localAddress:foo+family:6");
    expect(options.host).to.equal("1234");
    expect(preLookup.callCount).to.equal(0);
  });

  it("getNameAsync should handle lookup error", done => {
    ElectrodeKeepAlive.clearDnsCache();
    const eka = new ElectrodeKeepAlive();
    const preLookup = sinon.stub(eka, "preLookup", (host, options, cb) =>
      cb(new Error("blah"))
    );
    eka.getNameAsync({ host: "blah" }, (err, name) => {
      preLookup.restore();
      expect(name).to.equal("blah+ip:_none_");
      done();
    });
  });

  it("preLookup should handle dns lookup error", () => {
    ElectrodeKeepAlive.clearDnsCache();
    const eka = new ElectrodeKeepAlive();
    const lookup = sinon.stub(dns, "lookup", (host, opts, cb) => {
      cb(new Error("bummer"));
    });
    let error;
    eka.preLookup("test", { hints: 1 }, err => {
      error = err;
    });
    lookup.restore();
    expect(error.message).to.equal("bummer");
  });

  it("should delete expired DNS checker", done => {
    ElectrodeKeepAlive.clearDnsCache();
    ElectrodeKeepAlive.checkExpiredDnsInterval = 20;
    const dc = ElectrodeKeepAlive.DNS_CACHE;
    const now = Date.now();
    dc.a = { expiry: now + 5000 };
    dc.d1 = { expiry: now };
    dc.d2 = { expiry: now };
    dc.x1 = { expiry: now + 1000 };
    dc.d3 = { expiry: now };
    dc.d4 = { expiry: now };
    dc.x2 = { expiry: now + 2000 };
    setTimeout(() => {
      const eka = new ElectrodeKeepAlive();
      eka.preLookup("www.google.com", {});
      expect(dc).to.have.keys("a", "x1", "x2");
      done();
    }, 30);
  });
});
