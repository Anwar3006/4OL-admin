import { supabase } from "@/app/utils/supabaseClient";

export const getAllSymptoms = async () => {
  try {
    const { data, error } = await supabase
      .from("symptoms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching symptoms:", error);
    throw error;
  }
};

export const getSymptomById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("symptoms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching symptom:", error);
    throw error;
  }
};

export const createSymptom = async (symptomData) => {
  try {
    const { data, error } = await supabase
      .from("symptoms")
      .insert(symptomData)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating symptom:", error);
    throw error;
  }
};

export const updateSymptom = async (id, symptomData) => {
  try {
    const { data, error } = await supabase
      .from("symptoms")
      .update(symptomData)
      .eq("id", id)

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating symptom:", error);
    throw error;
  }
};

export const deleteSymptom = async (id) => {
  try {
    const { error } = await supabase.from("symptoms").delete().eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting symptom:", error);
    throw error;
  }
};
