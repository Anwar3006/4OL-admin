import firebase from "firebase-admin";
import serviceAccountKey from "../../api/notifications/serviceAccountKey.json";

if (!firebase.apps.length) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccountKey),
    projectId: serviceAccountKey.project_id,
  });
}

export async function POST(req) {
  try {
    const body = await req.json(); // Get data from request body
    const { title, description } = body;
    console.log("body", body);
    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
        }
      );
    }

    const condition = "'is_tracker_notifications_enabled' in topics";

    await firebase.messaging().send({
      condition: condition,
      notification: {
        title,
        body: description,
      },
    });
    console.log(`Notification sent: ${title}`);
    return new Response(
      JSON.stringify({ message: "Notification sent successfully" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error sending notification:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500 }
    );
  }
}
