import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

function asArrayBuffer(buffer: Buffer): Buffer<ArrayBuffer> {
  return Buffer.copyBytesFrom(buffer);
}

export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, asArrayBuffer(key), asArrayBuffer(iv), { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decrypt(ciphertext: string, hexKey: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    return ciphertext;
  }
  const payload = ciphertext.slice(PREFIX.length);
  const [ivHex, dataHex, tagHex] = payload.split(":");
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, asArrayBuffer(key), asArrayBuffer(iv), { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(asArrayBuffer(tag));
  return Buffer.concat([
    decipher.update(asArrayBuffer(data)),
    decipher.final(),
  ]).toString("utf8");
}
