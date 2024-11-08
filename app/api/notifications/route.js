import firebase from "firebase-admin";
import serviceAccountKey from "../../api/notifications/serviceAccountKey.json";
import { supabase } from "@/app/utils/supabaseClient";
import moment from "moment";
import cron from "node-cron";

export async function POST(req, res) {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });
  }

  const { data: medicationsData, error: medicationsError } = await supabase
    .from("medications")
    .select("*, user_profiles ( fcm_token )");

  if (medicationsError) {
    console.error("Error fetching medications:", medicationsError.message);
    return;
  }

  medicationsData.forEach((user) => {
    const today = moment().format("YYYY-MM-DD");

    // Loop through each intake time entry_____

    user.intake_times.forEach((intake) => {
      if (intake.schedule_dates === today) {
        console.log(`Scheduling notifications for date: ${today}`);

        // Loop through each time in schedule_time
        intake.utc_schedule_times.forEach((time) => {
          //development
          // const [hour, minute] = moment(time, "hh:mm A")
          //   .format("HH:mm")
          //   .split(":");

          //production
          const [hour, minute] = moment(time).format("HH:mm").split(":");

          console.log("~ minutes :", minute);
          console.log("~ hours :", hour);
          // Schedule a cron job for the specified hour and minute
          cron.schedule(`${minute} ${hour} * * *`, async () => {
            console.log(`Sending notification for time: ${time}`);

            try {
              await firebase.messaging().send({
                token: user.user_profiles.fcm_token,
                notification: {
                  title: "Medication Reminder",
                  body: `It's time to take your medication scheduled for ${time}`,
                },
              });
              console.log(`Notification sent at ${time}`);
            } catch (err) {
              console.error(`Error sending notification at ${time}:`, err);
            }
          });
        });
      }
    });
  });

  // Fetch medications from the database
  // const { data: medicationsData, error: medicationsError } = await supabase
  //   .from("medications")
  //   .select(
  //     `
  //   *,
  //   user_profiles (
  //     fcm_token
  //   )
  // `
  //   )
  //   .eq("id", id);
  //   ;

  // if (medicationsError) {
  //   console.error("Error fetching medications:", medicationsError.message);
  //   return new Response(medicationsError.message, { status: 500 });
  // }
  // if(medicationsData?.length == 0){
  //   return new Response(new Error("Medication not found"), { status: 404 });
  // }

  // const medication = medicationsData[0]

  // const medication_days = medicationsData.map((medication) => medication);

  // console.log("Medication days by user:", medication_days);
  // if (medication_days === "Only one day") {
  //   console.log("user select only one day");
  // }

  // console.log("days_extract", medication_days);

  // Helper function to parse time string into a Date object
  // const parseIntakeTime = (intakeTimeStr) => {
  //   const [timePart, datePart] = intakeTimeStr.split(" on ");
  //   const [time, period] = timePart.split(" ");
  //   const [hours, minutes] = time.split(":").map(Number);
  //   const [year, month, day] = datePart.split("-").map(Number);

  //   let hours24 = hours;
  //   if (period === "PM" && hours !== 12) {
  //     hours24 += 12;
  //   } else if (period === "AM" && hours === 12) {
  //     hours24 = 0;
  //   }
  //   return new Date(year, month - 1, day, hours24, minutes);
  // };

  // // Merge medication data with user profiles
  // medicationsData.forEach((medication) => {
  //   const userProfile = userProfileData.find(
  //     (user) => user.id === medication.user_id
  //   ); // Match user by id

  //   console.log("~ user_profiles :", userProfile);

  //   if (!userProfile) {
  //     console.error(
  //       `User profile not found for user_id: ${medication.user_id}`
  //     );
  //     return;
  //   }

  //   const { fcm_token } = userProfile;

  //   // Loop through intake_times for this user and schedule notifications
  //   medication.intake_times.forEach((timeString) => {
  //     const parsedTime = parseIntakeTime(timeString);

  //     const hours = parsedTime.getHours();
  //     const minutes = parsedTime.getMinutes();
  //     const day = parsedTime.getDate();
  //     const month = parsedTime.getMonth() + 1;
  //     const year = parsedTime.getFullYear();

  //     // Cron job to trigger notification at the correct time
  //     const cronExpression = `${minutes} ${hours} ${day} ${month} *`; // Cron format

  //     cron.schedule(cronExpression, async () => {
  //       const currentTime = new Date();

  //       // If the current time matches the medication's time

  //       if (currentTime.toDateString() === parsedTime.toDateString()) {
  //         console.log(
  //           "Sending notification to user ${medication.user_id} at: ${parsedTime}"
  //         );

  //         try {
  //           // Send notification via FCM for this user
  //           await firebase.messaging().send({
  //             token: fcm_token, // Specific user's FCM token
  //             notification: {
  //               title: "Medication Reminder",
  //               body: `It's time to take your medication: ${timeString}`,
  //             },
  //           });

  //           console.log(
  //             `Notification sent to user ${medication.user_id} successfully`
  //           );
  //         } catch (err) {
  //           console.log(
  //             `Notification sent to user ${medication.user_id} successfully`
  //           );
  //           // console.error(Error sending notification to user ${medication.user_id});
  //         }
  //       }
  //     });
  //   });
  // });
}
