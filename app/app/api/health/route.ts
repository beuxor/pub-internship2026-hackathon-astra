import { NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await querySnowflake(
      `SELECT CURRENT_ACCOUNT() AS account, CURRENT_ROLE() AS role, CURRENT_WAREHOUSE() AS wh`,
      { warehouse: "TEAM_A_WH" },
    );
    return NextResponse.json(rows);
  } catch (e) {
    console.error(new Date().toISOString(), "[health]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Snowflake接続に失敗" },
      { status: 500 },
    );
  }
}
