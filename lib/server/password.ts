import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback)

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const key = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${key.toString("hex")}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, expectedHex] = storedHash.split(":")
  if (!salt || !expectedHex) return false
  const actual = (await scrypt(password, salt, 64)) as Buffer
  const expected = Buffer.from(expectedHex, "hex")
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

