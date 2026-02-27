import { MobileCardConfig } from "../mobile-card-types";
import { TChatOutput } from "@/schemas/chat.schema";
import { Badge } from "@/components/ui/badge";

export const chatCardConfig: MobileCardConfig<TChatOutput> = {
  header: {
    title: (data) => `Ticket #${data.id}`,
    subtitle: (data) => data.subject || "No Subject",
    badge: (data) => (
      <Badge
        variant={data.status === "Open" ? "secondary" : "outline"}
        className={data.status === "Open" ? "bg-emerald-100 text-emerald-700" : ""}
      >
        {data.status}
      </Badge>
    ),
  },
  fields: [
    {
      id: "description",
      label: "Message",
      render: (data) => data.message || "No Message",
    },
    {
      id: "requested_by",
      label: "Requested By",
      render: (data) =>
        `${data.user_profiles?.first_name} ${data.user_profiles?.last_name}`,
    },
    {
      id: "priority",
      label: "Priority",
      render: (data) => (
        <Badge
          variant={
            data.priority === "High"
              ? "destructive"
              : data.priority === "Medium"
              ? "default"
              : "secondary"
          }
        >
          {data.priority}
        </Badge>
      ),
    },
  ],
  getId: (data) => String(data.id),
};
