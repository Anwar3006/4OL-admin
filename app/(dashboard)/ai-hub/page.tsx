import { redirect } from "next/navigation";

// O-D6: the live AI Hub is the single tabbed page at /ai.
export default function Page() {
  redirect("/ai");
}
