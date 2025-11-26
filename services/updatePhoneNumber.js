/**
 * Update User's phone number in both user_profiles and auth tables
 * @param {string} userId - User ID to update
 * @param {string} phone - New phone number
 * @returns {Promise<Object>} - Result of the operation
 */
export const updatePhoneNumber = async (userId, phone) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!phone) {
      throw new Error("Phone number is required");
    }

    const response = await fetch("/api/update-phone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, phone }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to update phone number");
    }

    return result;
  } catch (error) {
    console.error("Error updating phone number:", error);
    throw error;
  }
};

export default updatePhoneNumber;
