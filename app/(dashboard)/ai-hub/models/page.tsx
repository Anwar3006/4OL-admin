import { redirect } from "next/navigation";

// O-D6: deep link into the tabbed AI Hub at /ai.
export default function Page() {
  redirect("/ai?tab=models");
}
