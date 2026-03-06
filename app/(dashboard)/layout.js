import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import DashboardWrapper from "./_components/DashboardWrapper";

export default function RootLayout({ children }) {
  return (
    <PermissionsProvider>
      <DashboardWrapper>{children}</DashboardWrapper>
    </PermissionsProvider>
  );
}
