"use strict";

/* eslint-disable no-var */

var assert = require("assert");

var EKA = require("..");

var e1 = new EKA();

assert(e1);

var check = require("../lib/check");

assert(check.HAS_SCHEDULING === false);
