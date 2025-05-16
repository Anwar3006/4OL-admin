import { supabase } from "@/app/utils/supabaseClient";

export default async function getFaqs() {
  const { data, error } = await supabase
    .from("FAQs")
    .select(
      "id, question, answer, created_at, updated_by, user_profiles!created_by ( id, first_name, last_name )"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching FAQs:", error);
    return null;
  }

  return data;
}
