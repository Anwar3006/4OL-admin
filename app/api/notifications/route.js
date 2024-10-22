import firebase from "firebase-admin";
import cron from "node-cron";
import moment from "moment-timezone";
import serviceAccountKey from "./serviceAccountKey.json";
import { supabase } from "@/app/utils/supabaseClient";

export async function POST(req, res) {
  console.log("~ serviceAccountKey :", serviceAccountKey);

  if (!firebase.apps.length) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });
  }

  // Fetch medications from the database
  const { data: medicationsData, error: medicationsError } = await supabase
    .from("medications")
    .select("*");

  if (medicationsError) {
    console.error("Error fetching medications:", medicationsError.message);
    return;
  }
  console.log("Medications data:", medicationsData);

  // Fetch user profiles (FCM tokens)
  const { data: userProfileData, error: userProfileError } = await supabase
    .from("user_profiles")
    .select("id, fcm_token"); // Assuming user_profiles has 'id' and 'fcm_token'

  if (userProfileError) {
    console.error("Error fetching user profiles:", userProfileError.message);
    return;
  }

  console.log("User FCM tokens:", userProfileData);

  const medication_days = medicationsData.map((medication) => medication);

  console.log("Medication days by user:", medication_days);
  // if (medication_days === "Only one day") {
  //   console.log("user select only one day");
  // }

  // console.log("days_extract", medication_days);

  // Helper function to parse time string into a Date object
  const parseIntakeTime = (intakeTimeStr) => {
    const [timePart, datePart] = intakeTimeStr.split(" on ");
    const [time, period] = timePart.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    const [year, month, day] = datePart.split("-").map(Number);

    let hours24 = hours;
    if (period === "PM" && hours !== 12) {
      hours24 += 12;
    } else if (period === "AM" && hours === 12) {
      hours24 = 0;
    }
    return new Date(year, month - 1, day, hours24, minutes);
  };

  // Merge medication data with user profiles
  medicationsData.forEach((medication) => {
    const userProfile = userProfileData.find(
      (user) => user.id === medication.user_id
    ); // Match user by id

    console.log("~ user_profiles :", userProfile);

    if (!userProfile) {
      console.error(
        `User profile not found for user_id: ${medication.user_id}`
      );
      return;
    }

    const { fcm_token } = userProfile;

    // Loop through intake_times for this user and schedule notifications
    medication.intake_times.forEach((timeString) => {
      const parsedTime = parseIntakeTime(timeString);

      const hours = parsedTime.getHours();
      const minutes = parsedTime.getMinutes();
      const day = parsedTime.getDate();
      const month = parsedTime.getMonth() + 1;
      const year = parsedTime.getFullYear();

      // Cron job to trigger notification at the correct time
      const cronExpression = `${minutes} ${hours} ${day} ${month} *`; // Cron format

      cron.schedule(cronExpression, async () => {
        const currentTime = new Date();

        // If the current time matches the medication's time

        if (currentTime.toDateString() === parsedTime.toDateString()) {
          console.log(
            "Sending notification to user ${medication.user_id} at: ${parsedTime}"
          );

          try {
            // Send notification via FCM for this user
            await firebase.messaging().send({
              token: fcm_token, // Specific user's FCM token
              notification: {
                title: "Medication Reminder",
                body: `It's time to take your medication: ${timeString}`,
              },
            });

            console.log(
              `Notification sent to user ${medication.user_id} successfully`
            );
          } catch (err) {
            console.log(
              `Notification sent to user ${medication.user_id} successfully`
            );
            // console.error(Error sending notification to user ${medication.user_id});
          }
        }
      });
    });
  });
}

// import firebase from "firebase-admin";
// import cron from "node-cron";
// import moment from "moment-timezone";
// import serviceAccountKey from "./serviceAccountKey.json";
// import { supabase } from "@/app/utils/supabaseClient";

// export async function POST(req, res) {
//   console.log("~ serviceAccountKey :", serviceAccountKey);

//   if (!firebase.apps.length) {
//     firebase.initializeApp({
//       credential: firebase.credential.cert(serviceAccountKey),
//       projectId: serviceAccountKey.project_id,
//     });
//   }

//   // Fetch medications from the database
//   const { data: medicationsData, error: medicationsError } = await supabase
//     .from("medications")
//     .select("*");

//   if (medicationsError) {
//     console.error("Error fetching medications:", medicationsError.message);
//     return;
//   }
//   console.log("Medications data:", medicationsData);

//   // Fetch user profiles (FCM tokens)
//   const { data: userProfileData, error: userProfileError } = await supabase
//     .from("user_profiles")
//     .select("id, fcm_token");

//   if (userProfileError) {
//     console.error("Error fetching user profiles:", userProfileError.message);
//     return;
//   }

//   console.log("User FCM tokens:", userProfileData);

//   // Helper function to parse time string into a Date object
//   const parseIntakeTime = (intakeTimeStr) => {
//     const [timePart, datePart] = intakeTimeStr.split(" on ");
//     const [time, period] = timePart.split(" ");
//     const [hours, minutes] = time.split(":").map(Number);
//     const [year, month, day] = datePart.split("-").map(Number);

//     let hours24 = hours;
//     if (period === "PM" && hours !== 12) {
//       hours24 += 12;
//     } else if (period === "AM" && hours === 12) {
//       hours24 = 0;
//     }
//     return new Date(year, month - 1, day, hours24, minutes);
//   };

//   // Merge medication data with user profiles
//   medicationsData.forEach((medication) => {
//     const userProfile = userProfileData.find(
//       (user) => user.id === medication.user_id
//     );

//     if (!userProfile) {
//       console.error(
//         `User profile not found for user_id: ${medication.user_id}`
//       );
//       return;
//     }

//     const { fcm_token } = userProfile;

//     // Fetch course start and end dates
//     const courseStartDate = moment(medication.course_start_date);
//     const courseEndDate = moment(medication.course_end_date);
//     const days = medication.days;

//     console.log("~ medication?.days :", medication?.days);

//     const scheduleNotifications = (parsedTime, intervalDays) => {
//       let currentDate = moment(courseStartDate);
//       while (currentDate.isSameOrBefore(courseEndDate)) {
//         const cronExpression = `${parsedTime.getMinutes()} ${parsedTime.getHours()} ${currentDate.date()} ${
//           currentDate.month() + 1
//         } *`;

//         cron.schedule(cronExpression, async () => {
//           console.log(
//             `Sending notification to user ${medication.user_id} at: ${currentDate}`
//           );
//           try {
//             await firebase.messaging().send({
//               token: fcm_token,
//               notification: {
//                 title: "Medication Reminder",
//                 body: `It's time to take your medication: ${days}`,
//               },
//             });
//             console.log(
//               `Notification sent to user ${medication.user_id} successfully`
//             );
//           } catch (err) {
//             console.error(
//               `Error sending notification to user ${medication.user_id}:`,
//               err
//             );
//           }
//         });

//         currentDate.add(intervalDays, "days");
//       }
//     };

//     // Determine the notification scheduling based on user selection
//     medication.intake_times.forEach((timeString) => {
//       const parsedTime = parseIntakeTime(timeString);

//       // Handling different day selection
//       if (days === "Only one day") {
//         // Schedule for only one specific date
//         const cronExpression = `${parsedTime.getMinutes()} ${parsedTime.getHours()} ${courseStartDate.date()} ${
//           courseStartDate.month() + 1
//         } *`;

//         cron.schedule(cronExpression, async () => {
//           console.log(
//             `Sending notification to user ${medication.user_id} at: ${courseStartDate}`
//           );
//           try {
//             await firebase.messaging().send({
//               token: fcm_token,
//               notification: {
//                 title: "Medication Reminder",
//                 body: `It's time to take your medication: ${days}`,
//               },
//             });
//             console.log(
//               `Notification sent to user ${medication.user_id} successfully`
//             );
//           } catch (err) {
//             console.error(
//               `Error sending notification to user ${medication.user_id}:`,
//               err
//             );
//           }
//         });
//       } else if (days === "Weekly") {
//         // Schedule weekly notifications
//         const weekdays = medication.intake_times
//           .map((time) => {
//             const parsedDate = moment(time, "hh:mm A on YYYY-MM-DD");
//             const dayNumber = parsedDate.day();
//             if (isNaN(dayNumber)) {
//               console.error(`Invalid day format for time: ${time}`);
//               return null;
//             }
//             return dayNumber;
//           })
//           .filter((day) => day !== null);

//         console.log("Weekdays:", weekdays);

//         // Schedule notifications for each valid weekday
//         weekdays.forEach((weekday) => {
//           const cronExpression = `${parsedTime.minutes()} ${parsedTime.hours()} * * ${weekday}`;

//           cron.schedule(cronExpression, async () => {
//             console.log(
//               `Sending notification to user ${medication.user_id} on day ${weekday}`
//             );
//             try {
//               await firebase.messaging().send({
//                 token: fcm_token,
//                 notification: {
//                   title: "Medication Reminder",
//                   body: `It's time to take your medication: ${days}`,
//                 },
//               });
//               console.log(
//                 `Notification sent to user ${medication.user_id} successfully`
//               );
//             } catch (err) {
//               console.error(
//                 `Error sending notification to user ${medication.user_id}:`,
//                 err
//               );
//             }
//           });
//         });
//       } else if (days.startsWith("Every")) {
//         // Extract interval for every X days
//         const intervalDays = parseInt(days.split(" ")[1]);
//         scheduleNotifications(parsedTime, intervalDays);
//       } else {
//         // Specific days provided
//         const specificDays = days.split(",").map((d) => d.trim());
//         specificDays.forEach((weekDay) => {
//           const weekdayNumber = moment(weekDay, "ddd").day();
//           const cronExpression = `${parsedTime.getMinutes()} ${parsedTime.getHours()} * * ${weekdayNumber}`;

//           cron.schedule(cronExpression, async () => {
//             console.log(
//               `Sending notification to user ${medication.user_id} on ${weekDay}`
//             );
//             try {
//               await firebase.messaging().send({
//                 token: fcm_token,
//                 notification: {
//                   title: "Medication Reminder",
//                   body: `It's time to take your medication: ${days}`,
//                 },
//               });
//               console.log(
//                 `Notification sent to user ${medication.user_id} successfully`
//               );
//             } catch (err) {
//               console.error(
//                 `Error sending notification to user ${medication.user_id}:`,
//                 err
//               );
//             }
//           });
//         });
//       }
//     });
//   });
// }
