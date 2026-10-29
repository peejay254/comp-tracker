import { getDb } from "@/lib/mongodb";
import { fail, guard, json } from "@/lib/http";

export const dynamic = "force-dynamic";

// Soft delete (kept with who/when). Inspectors may only delete their own records; admins any.
export async function DELETE(req, { params }) {
  const { user, res } = await guard(req, ["admin", "inspector"]);
  if (res) return res;
  const { id } = await params;
  const col = (await getDb()).collection("inspections");
  const doc = await col.findOne({ _id: id, deletedAt: null });
  if (!doc) return fail("Record not found.", 404);
  if (user.role !== "admin" && doc.inspectorId !== user.id) return fail("You can only delete your own inspections.", 403);
  await col.updateOne({ _id: id }, { $set: { deletedAt: new Date().toISOString(), deletedBy: user.name } });
  return json({ ok: true });
}
