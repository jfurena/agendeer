// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAlfjB2FZeonwBt8mE83Kyzmydoq7QH7P0",
    authDomain: "agenda-a4d6e.firebaseapp.com",
    projectId: "agenda-a4d6e",
    storageBucket: "agenda-a4d6e.firebasestorage.app",
    messagingSenderId: "362285963580",
    appId: "1:362285963580:web:38db813170c54c7d2b2639",
    measurementId: "G-CSRK0JKMFQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
