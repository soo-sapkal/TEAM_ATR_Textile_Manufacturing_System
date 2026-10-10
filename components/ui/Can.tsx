import type { ReactNode } from "react";
import type { Permission } from "@/lib/domain/types";
import { hasAllPermissions, hasAnyPermission } from "@/lib/auth/permissions";
import { useDemo } from "@/lib/demo/context";

export function Can({ perm, anyOf, allOf, fallback = null, children }: { perm?: Permission; anyOf?: Permission[]; allOf?: Permission[]; fallback?: ReactNode; children: ReactNode }) {
  const { user } = useDemo();
  const allowed = perm ? hasAnyPermission(user, [perm]) : allOf ? hasAllPermissions(user, allOf) : anyOf ? hasAnyPermission(user, anyOf) : true;
  return allowed ? children : fallback;
}
