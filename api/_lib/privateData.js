import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ConfigurationError, requireEnv } from "./config.js";

const encryptionKey = () => {
  const key = Buffer.from(requireEnv("CONTACT_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new ConfigurationError("CONTACT_ENCRYPTION_KEY");
  return key;
};

export const encryptPrivateText = (value) => {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value.trim(), "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
};

const asBuffer = (value) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string" && value.startsWith("\\x")) return Buffer.from(value.slice(2), "hex");
  return Buffer.from(value ?? "");
};

export const decryptPrivateText = (value) => {
  if (!value) return null;
  const packed = asBuffer(value);
  if (packed[0] !== 1 || packed.length < 30) throw new ConfigurationError("encrypted contact data");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), packed.subarray(1, 13));
  decipher.setAuthTag(packed.subarray(13, 29));
  return Buffer.concat([decipher.update(packed.subarray(29)), decipher.final()]).toString("utf8");
};
