import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDIKd_vyUT_plVfZMCJkqDvZpPbRoJ_gRA",
  authDomain: "absensi-face-recognition-a0b38.firebaseapp.com",
  projectId: "absensi-face-recognition-a0b38",
  storageBucket: "absensi-face-recognition-a0b38.firebasestorage.app",
  messagingSenderId: "431681335810",
  appId: "1:431681335810:web:2d84575175e64f8978ad1b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const dbFirestore = getFirestore(app);
