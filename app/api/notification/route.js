import firebase from "firebase-admin";
import cron from "node-cron"; // Import node-cron
import moment from "moment-timezone"; // Import moment-timezone
import serviceAccountKey from "./serviceAccountKey.json";
import { supabase } from "@/app/utils/supabaseClient";

export async function POST(req, res) {
  console.log("~ serviceAccountKey :", serviceAccountKey);

  const { data, error } = await supabase
    .from("medications") // Table name
    .select("*");
  if (error) {
    console.error("Error fetching medications:", error.message);
  } else {
    console.log("Medications data:", data); // Successfully fetched data
  }

  const daysValues = ["Mon", "Thu", "Sat"]; // Selected days
  const frequency = "Every 10 days"; // Can be: "One day", "Every day", "Weekly", "Every X days"
  const startDate = new Date("2024-10-17"); // Example start date
  const endDate = new Date("2024-11-17"); // Example end date

  // const filteredUser = data.filter(
  // (item) => item.created_by == item.updated_by
  // );

  const isValidDay = (currentDate, startDate, frequency, daysValues) => {
    const currentDay = moment(currentDate).format("ddd"); // Get the current day (e.g., "Mon", "Tue")

    // Check for "Every day"
    if (frequency === "Every day") return true;

    // Check for "Only one day"
    if (frequency === "Only One day") {
      return currentDate.toDateString() === new Date(startDate).toDateString();
    }

    // Check for "Every X days"
    const match = frequency.match(/Every (\d+) days/);
    if (match) {
      const xDays = parseInt(match[1], 10);
      const diffInDays = Math.floor(
        (currentDate - new Date(startDate)) / (1000 * 60 * 60 * 24)
      );
      return diffInDays % xDays === 0; // Valid if the difference is a multiple of X
    }

    // Check for "Weekly" notifications (e.g., "Mon", "Tue", etc.)
    if (daysValues.length > 0) {
      return daysValues.includes(currentDay);
    }

    // For "Monthly" checks, you can add additional logic here if needed.
    return false;
  };

  const intakeTimes = data.map((item) => item.intake_times).flat();

  // console.log("~ filteredUser :", filteredUser);
  console.log("~ intake_times :", intakeTimes);

  const parseIntakeTime = (intakeTimeStr) => {
    // Split the intake time into time and date parts
    const [timePart, datePart] = intakeTimeStr.split(" on ");

    // Extract time and AM/PM

    const [time, period] = timePart.split(" ");
    const [hours, minutes] = time.split(":").map(Number);

    // Extract the year, month, and day from the date part
    const [year, month, day] = datePart.split("-").map(Number);

    // Convert 12-hour time format to 24-hour time format
    let hours24 = hours;
    if (period === "PM" && hours !== 12) {
      hours24 += 12;
    } else if (period === "AM" && hours === 12) {
      hours24 = 0; // midnight case
    }

    // Return a Date object
    return new Date(year, month - 1, day, hours24, minutes);
  };

  try {
    // Initialize Firebase app only if not already initialized
    if (!firebase.apps.length) {
      firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccountKey),
        projectId: serviceAccountKey.project_id,
      });
    } else {
      firebase.app();
    }

    intakeTimes.forEach((timeString) => {
      const parsedTime = parseIntakeTime(timeString); // Parse intake time into Date object

      const hours = parsedTime.getHours();
      const minutes = parsedTime.getMinutes();
      const day = parsedTime.getDate();
      const month = parsedTime.getMonth() + 1; // Months are zero-indexed in JS (0 = Jan, 1 = Feb, ...)
      const year = parsedTime.getFullYear();
      const cronExpression = `${minutes} ${hours} ${day} ${month} *`; // Cron expression for specific date & time

      console.log("~ cronExpression :", cronExpression);
      cron.schedule(cronExpression, async () => {
        const currentDate = new Date();
        if (
          currentDate >= new Date(startDate) &&
          currentDate <= new Date(endDate)
        ) {
          if (isValidDay(currentDate, startDate, frequency, daysValues)) {
            try {
              // Send notification via FCM
              await firebase.messaging().send({
                token:
                  "cmMvRnWdTNi_x79EseFPY4:APA91bFnjBu8IYeNUqoqG-DUumVkPUssnn-QNJUTU8as2JFJUIh6o0WGFTszOfUTV79KYudozTUyEjxBCe7buEg4qeuQISmYvZ91M5__x2_0-ftEQt04Pr8UuKW7a7RLqPKwal6vAA3s",
                notification: {
                  title: "Scheduled Notification",
                  body: `Reminder for time: ${timeString}`,
                },
              });

              console.log("Notification sent successfully");
            } catch (err) {
              console.error("Error sending notification:", err);
            }
          }
        } else {
          console.log(
            "Current date is outside the specified range. No notification sent."
          );
        }
      });
      return new Response(
        "Cron job started: Notifications will be sent according to IntervalIntake Timing"
      );
    });
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return new Response(error.message, { status: 500 });
  }
}
