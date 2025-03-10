import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBadH64ld5EJ49NaeR8DLXjXN1Twj7bp-Y",
    authDomain: "messenger-app-b4bfd.firebaseapp.com",
    projectId: "messenger-app-b4bfd",
    storageBucket: "messenger-app-b4bfd.firebasestorage.app",
    messagingSenderId: "1067309232197",
    appId: "1:1067309232197:web:524a1dbb96a6a62e0a332c",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
