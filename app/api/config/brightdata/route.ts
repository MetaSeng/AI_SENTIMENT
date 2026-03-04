import { NextResponse } from "next/server";

export function GET() {
  const configured = Boolean(process.env.BRIGHTDATA_API_KEY);
  return NextResponse.json({ configured });
}
