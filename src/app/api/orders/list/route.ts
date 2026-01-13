import { NextResponse } from "next/server";
import { listOrders } from "@/lib/store";

export async function GET() {
  try {
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error listing orders", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

