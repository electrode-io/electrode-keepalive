"use strict";

const agent = require("../../lib/index");

describe("index", () => {
  it("should export a function", () => {
    expect(agent).to.be.a("function");
  });
});
