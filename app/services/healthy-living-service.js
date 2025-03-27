import { supabase } from "@/app/utils/supabaseClient";

export const getAllHealthyLivingEntries = async () => {
  try {
    const { data, error } = await supabase
      .from("healthy_living")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching healthy living entries:", error);
    throw error;
  }
};

export const getHealthyLivingEntryById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("healthy_living")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching healthy living entry:", error);
    throw error;
  }
};

export const createHealthyLivingEntry = async (entryData) => {
  try {
    const { data, error } = await supabase
      .from("healthy_living")
      .insert(entryData)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating healthy living entry:", error);
    throw error;
  }
};

export const updateHealthyLivingEntry = async (id, entryData) => {
  try {
    const { data, error } = await supabase
      .from("healthy_living")
      .update(entryData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating healthy living entry:", error);
    throw error;
  }
};

export const deleteHealthyLivingEntry = async (id) => {
  try {
    const { error } = await supabase
      .from("healthy_living")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting healthy living entry:", error);
    throw error;
  }
};
