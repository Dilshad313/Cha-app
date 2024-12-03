import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";

const firebaseConfig = {
  apiKey: "AIzaSyCHhjO-l7NXLJqL2SxIIylay_DO5LcvoCs",
  authDomain: "chat-app-di-25030.firebaseapp.com",
  projectId: "chat-app-di-25030",
  storageBucket: "chat-app-di-25030.appspot.com",
  messagingSenderId: "81945247440",
  appId: "1:81945247440:web:df3878be71753c5beea8d5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signup = async (username, email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      username: username.toLowerCase(),
      email,
      name: "",
      avatar: "",
      bio: "Hey, There I am using chat app",
      lastSeen: Date.now(),
    });

    await setDoc(doc(db, "chats", user.uid), {
      chatData: [],
    });

    toast.success("Sign-up successful!");
  } catch (error) {
    console.error("Firebase Error:", error);
    toast.error(error.message || "Sign-up failed!");
  }
};

const login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast.success("Logged in successfully!");
  } catch (error) {
    console.error("Login Error:", error.code);
    toast.error(error.message || "Login failed!");
  }
};

const logout = async () =>{
  try{
    await signOut(auth)
  }
  catch(error){
    console.error("Login Error:", error.code);
    toast.error(error.message || "Login failed!");
  }
}

export { signup, login, logout, auth, db };
