// export default async function deleteAccount(userId) {
//   try {
//     const response = await fetch("/api/delete-user", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ userId }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.error || "Failed to delete account");
//     }

//     return data;
//   } catch (error) {
//     console.error("Error deleting account:", error);
//     throw error;
//   }
// }
