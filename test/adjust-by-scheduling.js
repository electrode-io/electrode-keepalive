const Path = require("path");
const Fs = require("fs");
const check = require("../lib/check");

if (!check.HAS_SCHEDULING) {
  const pkg = require("../package.json");

  pkg.nyc.exclude.push("lib/scheduling-agent.js");
  pkg.nyc.statements = 95;
  pkg.nyc.branches = 91;
  pkg.nyc.lines = 95;
  Fs.writeFileSync(
    Path.join(__dirname, "../package.json"),
    JSON.stringify(pkg, null, 2)
  );
}
