import firebase from "firebase-admin";
import serviceAccountKey from "./serviceAccountKey.json";

// firebase.initializeApp({
//   credential: firebase.credential.cert(serviceAccountKey),
// });

// const sendNotification = async () => {
//   await firebase.messaging().send({
//     token:
//       "dOWv2rSIT56tLh5XiARCW-:APA91bEwrPXHCyjBhvWoO7eQnIhwpZXAD9JJ20pkYQu7bXftBlIejqDBqerBXSlwMES2m60-CvrvTfS5xsKYunWwOILTeBiqK-6UnIrZTnv-ILWC41oFCFL5GCtZgC8jRDG5kbFzCwzS",
//     notification: {
//       title: "Notification From Nextjs Server",
//       body: "This is a new notification",
//     },
//   });
// };

// setTimeout(() => {
//   sendNotification();
// }, 2000);

// export { firebase };
