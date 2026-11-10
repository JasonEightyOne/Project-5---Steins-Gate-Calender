import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { isAuthorized, runCronTick } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every minute by an external scheduler (e.g. cron-job.org) with
 * `Authorization: Bearer $CRON_SECRET`. Add `?sync=1` to force a calendar refresh.
 */
async function handle(req: Request) {
  if (!isAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const forceSync = new URL(req.url).searchParams.get("sync") === "1";
  const result = await runCronTick(await getDb(), { forceSync });
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
