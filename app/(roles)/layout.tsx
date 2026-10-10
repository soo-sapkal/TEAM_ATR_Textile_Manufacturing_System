import { StaffShell } from "@/components/shell/StaffShell";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

export default function RolesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SmoothScroll>
      <StaffShell>{children}</StaffShell>
    </SmoothScroll>
  );
}
