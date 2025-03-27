import { supabase } from "@/app/utils/supabaseClient";

export const getAllDiseases = async () => {
  try {
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching diseases:", error);
    throw error;
  }
};

export const getDiseaseById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching disease:", error);
    throw error;
  }
};

export const createDisease = async (diseaseData) => {
  try {
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .insert(diseaseData)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating disease:", error);
    throw error;
  }
};

export const updateDisease = async (id, diseaseData) => {
  try {
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .update(diseaseData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating disease:", error);
    throw error;
  }
};

export const deleteDisease = async (id) => {
  try {
    const { error } = await supabase
      .from("illness_and_conditions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting disease:", error);
    throw error;
  }
};
