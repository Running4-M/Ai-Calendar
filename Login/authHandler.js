import { db, auth } from "../backend/firebase.js"; // Import Firestore instance from firebase.js
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth

const userCountRef = doc(db, "userCount", "totalUsers"); // Document reference for totalUsers

// Utility: Display error messages
function displayError(errorCode) {
  const errorMessages = {
    "auth/email-already-in-use": "This email is already in use. Please log in instead.",
    "auth/invalid-email": "Invalid email format. Please provide a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters long.",
    "auth/user-not-found": "No account found with this email. Please sign up first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
  };
  return errorMessages[errorCode] || "An error occurred. Please try again.";
}

// Initialize Firebase Auth (await)
async function initializeAuth() {
  try {
    const initializedAuth = await getAuth();
    console.log("Auth initialized successfully.");
    return initializedAuth;
  } catch (error) {
    console.error("Error initializing auth:", error);
    throw error; // Re-throw error for handling if needed
  }
}

// Initialize user count if not set
async function initializeUserCount() {
  try {
    const docSnapshot = await getDoc(userCountRef);
    if (!docSnapshot.exists()) {
      console.log("User count document does not exist. Creating...");
      await setDoc(userCountRef, { count: 0 }); // Use setDoc to create the document with the count field
      console.log("User count initialized to 0.");
    } else {
      console.log("User count document already exists. Count: ", docSnapshot.data().count);
    }
  } catch (error) {
    console.error("Error checking user count document: ", error);
  }
}

// Handle signup
document.getElementById("signupButton").addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!email || !password) {
    alert("Please provide both email and password.");
    return;
  }

  try {
    const initializedAuth = await initializeAuth(); // Ensure auth is initialized
    const docSnapshot = await getDoc(userCountRef);
    if (!docSnapshot.exists()) {
      console.log("User count document does not exist.");
      return;
    }

    const userCount = docSnapshot.data().count;
    console.log("Current user count:", userCount); // Debugging: Log the current user count

    if (userCount >= 2) {
      alert("Signup limit reached. No more users can register at this time.");
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(initializedAuth, email, password);
    const user = userCredential.user;

    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email,
    });

    await updateDoc(userCountRef, {
      count: userCount + 1,
    });

    alert("Signup successful. Welcome!");
    window.location.href = "../Calendar/calendarMain.html"; // Redirect to Calendar page
  } catch (error) {
    alert(displayError(error.code));
    console.error("Error during signup:", error);
  }
});

// Handle login
document.getElementById("loginButton").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Please provide both email and password.");
    return;
  }

  try {
    const initializedAuth = await initializeAuth(); // Ensure auth is initialized
    const userCredential = await signInWithEmailAndPassword(initializedAuth, email, password);
    alert("Login successful. Welcome back!");
    window.location.href = "../Calendar/calendarMain.html"; // Redirect to Calendar page
  } catch (error) {
    alert(displayError(error.code));
    console.error("Error during login:", error);
  }
});

// Toggle between signup and login forms
document.getElementById("toggleFormButton").addEventListener("click", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  const toggleFormButton = document.getElementById("toggleFormButton");

  if (signupForm.style.display === "none") {
    signupForm.style.display = "block";
    loginForm.style.display = "none";
    toggleFormButton.textContent = "Already have an account? Login";
  } else {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
    toggleFormButton.textContent = "Don't have an account? Signup";
  }
});

// Check if the user is already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "../Calendar/calendarMain.html"; // Redirect if logged in
  }
});

// Initialize user count on page load
initializeUserCount();
