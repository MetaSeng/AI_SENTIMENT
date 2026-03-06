import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const SESSION_COOKIE = "ss_session"
const SESSION_DAYS = 7

interface SessionPayload {
  userId: string
  exp: number
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-only-secret-change-me"
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url")
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8")
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url")
}

function buildToken(payload: SessionPayload): string {
  const encoded = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

function parseToken(token: string): SessionPayload | null {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [encoded, signature] = parts
  const expected = sign(encoded)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload
    if (!payload.userId || typeof payload.exp !== "number") return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function createSession(userId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60
  const token = buildToken({ userId, exp })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function getSessionUser() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = parseToken(token)
  if (!payload) return null

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, fullName: true, businessName: true },
  })
}

