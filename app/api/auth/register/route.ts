import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/server/password"
import { createSession } from "@/lib/server/auth"

interface RegisterBody {
  email?: string
  password?: string
  fullName?: string
  businessName?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody
    const email = (body.email || "").trim().toLowerCase()
    const password = body.password || ""
    const fullName = (body.fullName || "").trim() || null
    const businessName = (body.businessName || "").trim() || null

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, businessName },
      select: { id: true, email: true, fullName: true, businessName: true },
    })

    await prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Default Project",
      },
    })

    await createSession(user.id)
    return NextResponse.json({ user })
  } catch (error) {
    console.error("Register failed:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}

