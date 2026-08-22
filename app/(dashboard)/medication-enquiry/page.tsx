import { redirect } from "next/navigation";

// Gap Analysis Part AB (M-D1): duplicate stub route replaced by a redirect
// to the canonical /medenquiry dashboard.
export default function Page() {
  redirect("/medenquiry");
}
