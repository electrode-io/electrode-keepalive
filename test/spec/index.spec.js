"use strict";

const ElectrodeKeepAlive = require("../../lib/index");

describe("index", () => {
  it("should export a function", () => {
    expect(ElectrodeKeepAlive).to.be.a("function");
  });
});
