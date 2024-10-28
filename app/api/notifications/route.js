import firebase from "firebase-admin";
import serviceAccountKey from "../../api/notifications/serviceAccountKey.json";

export async function POST(req, res) {
  // const data = await req.json();
  // const { id } = data;

  if (!firebase.apps.length) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });
  }

  try {
    // Send notification via FCM for this user
    await firebase.messaging().send({
      token:
        "eVAB9iSMQryzXotcjR_QTa:APA91bGw7yyPeJwdO7Qjq6sh01Bg1J1UkzxJ7fA9kgOFKh5lMDUCX_QXwUXZHkD-xd_0qihcTCwpyoOVUjQDfO3DzI7c6COdOR1trMAbKUt9wlQpJtXE4-i5GFR_Zg4SJ33tJeQDFCqR", // Specific user's FCM token
      notification: {
        title: "Medication Reminder",
        body: `It's time to take your medication`,
      },
    });

    new Response({ message: "notification send successFully" });

    console.log(`Notification sent to user successfully`);
  } catch (err) {
    console.log(`Notification sent to user successfully`);
    // console.error(Error sending notification to user ${medication.user_id});
  }

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
