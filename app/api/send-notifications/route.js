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
    const { fcm_token, title, description } = body;  

    if (!fcm_token || !title || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    await firebase.messaging().send({
      token: fcm_token,
      notification: {
        title,
        body: description,
      },
    });
    console.log('body', body);
    console.log(`Notification sent: ${title}`);
    return new Response(
      JSON.stringify({ message: "Notification sent successfully" }),
      { status: 200 }
    );
  } catch (err) {
    getAccessToken()

    console.error("Error sending notification:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500 }
    );
  }
}
