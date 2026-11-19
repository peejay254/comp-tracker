// [NEW FILE] GET /api/layouts -> the floor plan of every lab (any signed-in user).
import { guard, json } from "@/lib/http";
import { getAllLabs } from "@/lib/labs";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { res } = await guard(req);
  if (res) return res;
  return json(await getAllLabs());
}
