/**
 * M-D6: legacy route collapsed into the unified Marketing page.
 * Kept as a redirect so bookmarks/links keep working.
 */
import { redirect } from "next/navigation";

export default function DiscountsPage() {
  redirect("/marketing?tab=discounts");
}
