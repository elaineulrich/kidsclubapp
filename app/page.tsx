import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import PublicHome from "@/components/PublicHome";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user.role === "ADMIN") redirect("/admin");
  if (session?.user.role === "VOLUNTEER") redirect("/checkin");

  return <PublicHome />;
}
