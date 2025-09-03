/* TEST_FOR: add */
const { add, multiply } = require('../math');

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1,2)).toBe(3);
  });
});

describe('multiply', () => {
  it('multiplies two numbers', () => {
    expect(multiply(2,3)).toBe(6);
  });
});
