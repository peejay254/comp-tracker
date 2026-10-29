import { getDb } from "@/lib/mongodb";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await (await getDb()).command({ ping: 1 }); return Response.json({ ok: true }); }
  catch { return Response.json({ ok: false }, { status: 503 }); }
}
