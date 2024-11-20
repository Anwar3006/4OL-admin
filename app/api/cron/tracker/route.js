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
    .select("*, user_profiles ( fcm_token )");

  if (error) {
    console.error("Error fetching tracker logs:", error.message);
    return;
  }

  data?.forEach(async (tracker) => {
    if (tracker?.next_reminder_utc === currentUTCDate) {
      try {
        await firebase.messaging().send({
          token: tracker?.user_profiles?.fcm_token,
          notification: {
            title: "Period Reminder",
            body: `It's time to prepare for your period expected to start on ${currentUTCDate}. Stay healthy!`,
          },
          data: {
            screen: "",
            id: String(tracker?.id),
          },
        });

        await supabase.from("notifications").insert([
          {
            created_at: moment(new Date()).valueOf(),
            updated_at: moment(new Date()).valueOf(),
            is_seen: false,
            title: "Period Reminder",
            body: `It's time to prepare for your period expected to start on ${currentUTCDate}. Stay healthy!`,
            type: "tracker",
            screen: "",
            user_id: tracker?.user_profiles?.id,
          },
        ]);

        const currentReminderDate = new Date(tracker?.next_reminder);

        const lastPeriodDay = new Date(currentReminderDate);
        lastPeriodDay.setDate(
          currentReminderDate.getDate() + (tracker?.period_length - 1)
        );

        const nextCycleStartDate = new Date(lastPeriodDay);
        nextCycleStartDate.setDate(lastPeriodDay.getDate() + 1);

        const updatedReminderDateUTC = new Date(nextCycleStartDate);
        updatedReminderDateUTC.setDate(
          nextCycleStartDate.getDate() + tracker?.cycle_length
        );

        const userTimezoneOffset = new Date().getTimezoneOffset();

        const updatedReminderDateLocal = new Date(updatedReminderDateUTC);
        updatedReminderDateLocal.setMinutes(
          updatedReminderDateLocal.getMinutes() + userTimezoneOffset
        );

        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const nextReminderLocal = formatDate(updatedReminderDateLocal);
        const nextReminderUTC = formatDate(updatedReminderDateUTC);

        await supabase
          .from("tracker_logs")
          .update({
            next_reminder: nextReminderLocal,
            next_reminder_utc: nextReminderUTC,
            updated_at: moment(new Date()).valueOf(),
          })
          .eq("id", tracker.id);
      } catch (err) {
        console.error(`Error sending notification at:`, err);
      }
    }
  });
}
