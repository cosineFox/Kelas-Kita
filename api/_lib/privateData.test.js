import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptPrivateText, encryptPrivateText } from "./privateData.js";

test("encrypts private contacts with authenticated encryption", () => {
  process.env.CONTACT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const first = encryptPrivateText("lecturer@example.edu.my");
  const second = encryptPrivateText("lecturer@example.edu.my");

  assert.notDeepEqual(first, second);
  assert.equal(first.includes(Buffer.from("lecturer@example.edu.my")), false);
  assert.equal(decryptPrivateText(first), "lecturer@example.edu.my");
});
