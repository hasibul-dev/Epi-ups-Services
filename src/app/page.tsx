import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { accessibleModules } from "@/server/permissions";
import type { DeptCode } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const mods = await accessibleModules(user);
  if (mods.length === 0) {
    return (
      <main className="app-bg grid min-h-screen place-items-center p-6">
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <h1 className="text-xl font-bold">No department access</h1>
          <p className="mt-2 text-sm text-muted">Your account is active but has no module permissions. Please contact the system administrator.</p>
          <form action="/api/auth/logout" method="post" className="mt-5"><a href="/login" className="font-semibold text-accent">Back to sign in</a></form>
        </div>
      </main>
    );
  }
  redirect(`/${mods.includes(user.department as DeptCode) ? user.department : mods[0]}`);
}
