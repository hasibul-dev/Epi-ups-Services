import type { ReactNode } from "react";
import { AppProvider, type PermMap } from "@/components/AppContext";
import { AppShell } from "@/components/AppShell";
import { ACTIONS, DEPT_ORDER, type DeptCode } from "@/lib/constants";
import { requireUserPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage();
  const settings = await getSettings();
  const perms = {} as PermMap;
  for (const d of DEPT_ORDER) {
    perms[d] = { view: false, create: false, edit: false, delete: false, export: false };
    for (const a of ACTIONS) perms[d][a] = await can(user, d, a);
  }
  const allowed = DEPT_ORDER.filter((d: DeptCode) => perms[d].view);
  // never send the (potentially large) logo twice more than needed; it is a single string in settings
  return (
    <AppProvider user={{ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, department: user.department }} settings={settings} perms={perms}>
      <AppShell allowed={allowed}>{children}</AppShell>
    </AppProvider>
  );
}
