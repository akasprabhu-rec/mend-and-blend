import assert from "node:assert/strict";
import test from "node:test";

const phonePattern = "[0-9\\s\\(\\)\\+\\-]+";

test("phone number input pattern is valid in modern Unicode-sets regex mode", () => {
  const pattern = new RegExp(`^(?:${phonePattern})$`, "v");
  assert.equal(pattern.test("+91 90000-00000"), true);
  assert.equal(pattern.test("(044) 12345678"), true);
  assert.equal(pattern.test("12345abc"), false);
});
