import { MobileCardConfig } from "../mobile-card-types";
import { TChatOutput } from "@/schemas/chat.schema";

export const chatCardConfig: MobileCardConfig<TChatOutput> = {
  title: (data) => `Ticket #${data.id}`,
  subtitle: (data) => data.subject || "No Subject",
  description: (data) => data.message || "No Message",
  status: (data) => ({
    label: data.status,
    variant: data.status === "Open" ? "success" : "outline",
  }),
  metadata: (data) => [
    {
      label: "Requested By",
      value: `${data.user_profiles?.first_name} ${data.user_profiles?.last_name}`,
    },
    {
      label: "Priority",
      value: data.priority,
      variant:
        data.priority === "High"
          ? "destructive"
          : data.priority === "Medium"
          ? "warning"
          : "secondary",
    },
  ],
};
