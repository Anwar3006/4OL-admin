import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import { AiJobProviderClient } from "@/stores/ai-job-context";
import DashboardWrapper from "./_components/DashboardWrapper.tsx";

export default function RootLayout({ children }) {
  return (
    <PermissionsProvider>
      <AiJobProviderClient>
        <DashboardWrapper>{children}</DashboardWrapper>
      </AiJobProviderClient>
    </PermissionsProvider>
  );
}
