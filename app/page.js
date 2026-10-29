import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Tracker from "@/components/Tracker";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <Tracker user={user} />;
}
