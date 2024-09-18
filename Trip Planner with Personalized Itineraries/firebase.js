// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKo4kxkOnbm3e8ZZPpy_jhLGiHevtPnGI",
  authDomain: "trip-planner-55cf5.firebaseapp.com",
  projectId: "trip-planner-55cf5",
  storageBucket: "trip-planner-55cf5.appspot.com",
  messagingSenderId: "234042048276",
  appId: "1:234042048276:web:104af083ff77f87f4a0c01",
  measurementId: "G-WSNNMJYNM9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const db = getFirestore(app)
export {app, auth, db }