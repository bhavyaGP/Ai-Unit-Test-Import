// src/math.js
// Simple sample file for test generation

function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  const result = a * b;
  return Object.is(result, -0) ? 0 : result; // convert -0 to 0
}

module.exports = { add, multiply };
