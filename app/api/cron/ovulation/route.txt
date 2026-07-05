export const dynamic = "force-dynamic";
import { supabase } from "@/app/utils/supabaseClient";
import firebase from "firebase-admin";
import serviceAccountKey from "../../notifications/serviceAccountKey.json";
import moment from "moment";

export async function GET(req, res) {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });
  }
  const currentUTCDate = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tracker_logs")
    .select(
      "*, user_profiles ( fcm_token, is_tracker_notifications_enabled, id )"
    )
    .contains("fertile_window_dates_utc", JSON.stringify([currentUTCDate]));

  if (error) {
    console.error("Error fetching tracker logs:", error.message);
    return;
  }

  for (const tracker of data || []) {
    try {
      if (tracker?.user_profiles?.is_tracker_notifications_enabled) {
        await firebase.messaging().send({
          token: tracker?.user_profiles?.fcm_token,
          notification: {
            title:
              tracker?.ovulation_date_utc == currentUTCDate
                ? "Ovulation Day Alert"
                : "Fertile Window Reminder",
            body:
              tracker?.ovulation_date_utc == currentUTCDate
                ? "Today is your ovulation day! Take care of your health and stay informed about your cycle."
                : "You are in your most fertile window! This is your best chance for conception if you're planning to grow your family.",
          },
          data: {
            screen: "",
            id: String(tracker?.id),
          },
        });
      }

      await supabase.from("notifications").insert([
        {
          created_at: moment(new Date()).valueOf(),
          updated_at: moment(new Date()).valueOf(),
          is_seen: false,
          title:
            tracker?.ovulation_date_utc == currentUTCDate
              ? "Ovulation Day Alert"
              : "Fertile Window Reminder",
          body:
            tracker?.ovulation_date_utc == currentUTCDate
              ? "Today is your ovulation day! Take care of your health and stay informed about your cycle."
              : "You are in your most fertile window! This is your best chance for conception if you're planning to grow your family.",
          type: "tracker",
          screen: "",
          user_id: tracker?.user_profiles?.id,
        },
      ]);
    } catch (err) {
      console.error(`Error processing tracker with ID ${tracker.id}:`, err);
    }
  }
}
