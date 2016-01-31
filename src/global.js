"use strict";

const app = {
  preview: undefined,
  origin: undefined,
  range: [0, 2 * Math.PI],
  selection: undefined,
  rotate: undefined,
  size: Math.min(window.innerHeight || document.body.clientHeight, window.innerWidth || document.body.clientWidth)
};

exports.app = app;
