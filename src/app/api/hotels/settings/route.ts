import { NextResponse } from "next/server";
import { isHotelsMenuVisible } from "@/lib/tripjack-hotels/settings";

export async function GET() {
  const websiteMenuVisible = await isHotelsMenuVisible();
  return NextResponse.json({ websiteMenuVisible });
}
