import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  console.log("App url: ", appUrl);

  if (typeof window !== "undefined") {
    return appUrl || "";
  }

  if (process.env.NODE_ENV === "production") {
    return appUrl || "";
  }

  return appUrl || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [adminClient()],
});
