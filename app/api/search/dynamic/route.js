import { NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabaseClient";

const ALLOWED_TABLES = ["conditions", "symptoms", "healthy_living", "facility_profile"];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const query = searchParams.get("query");

    if (!table || !query) {
      return NextResponse.json(
        { error: "Table and query parameters are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json(
        { error: "Invalid table name" },
        { status: 400 }
      );
    }

    // Default column for search. `healthy_living` usually uses `title`.
    const searchColumn = table === "healthy_living" ? "title" : "name";

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .ilike(searchColumn, `%${query}%`)
      .limit(20);

    if (error) {
       console.error(`Supabase search error on table ${table}:`, error);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Unexpected search error:", err);
    return NextResponse.json(
      { error: "Failed to process search" },
      { status: 500 }
    );
  }
}
