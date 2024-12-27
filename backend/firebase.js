import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Function to fetch Firebase config from the full URL
async function getFirebaseConfig() {
  const response = await fetch("https://calendar-ai-backend.onrender.com/api/firebaseConfig");
  const firebaseConfig = await response.json();
  return firebaseConfig;
}

// Initialize Firebase and Firestore with dynamic config
let firebaseApp = null;

async function initializeFirebase() {
  if (!firebaseApp) {
    try {
      const firebaseConfig = await getFirebaseConfig(); // Fetch config from the backend
      const app = initializeApp(firebaseConfig); // Initialize Firebase with the fetched config
      firebaseApp = {
        db: getFirestore(app),
        auth: getAuth(app),
      };
      console.log("Firebase initialized successfully.");
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      throw error;
    }
  }
  return firebaseApp;
}

// Function to get the current user's ID (ensure Firebase is initialized first)
async function getCurrentUserId() {
  const { auth } = await initializeFirebase();
  if (!auth.currentUser) {
    throw new Error("User is not logged in.");
  }
  return auth.currentUser.uid;
}

// Function to fetch events
async function fetchEvents() {
  try {
    const { db } = await initializeFirebase();
    const userId = await getCurrentUserId(); // Get the logged-in user's ID
    const eventsCollectionRef = collection(db, "events");
    const q = query(eventsCollectionRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

// Function to save an event to Firestore
async function saveEvent(eventData) {
  try {
    const { db } = await initializeFirebase();
    const userId = await getCurrentUserId(); // Get the logged-in user's ID
    const eventsCollectionRef = collection(db, "events");
    const docRef = await addDoc(eventsCollectionRef, {
      ...eventData,
      userId: userId, // Add userId to link the event to the current user
    });
    console.log("Event added successfully with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error adding event:", error.message);
    throw error;
  }
}

// Function to fetch events for a specific day
async function fetchEventsForToday(dateStr) {
  console.log("Fetching events for today:", dateStr);
  try {
    const { db } = await initializeFirebase();
    const userId = await getCurrentUserId(); // Get the logged-in user's ID
    const eventsCollection = collection(db, "events");
    const todayQuery = query(
      eventsCollection,
      where("userId", "==", userId), // Only fetch events for the logged-in user
      where("date", "==", dateStr)
    );
    const querySnapshot = await getDocs(todayQuery);

    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Today's events fetched:", events);
    return events;
  } catch (error) {
    console.error("Error fetching today's events:", error.message);
    return [];
  }
}

// Function to save a response to Firestore
async function saveResponse(responseData) {
  try {
    const { db } = await initializeFirebase();
    const userId = await getCurrentUserId(); // Get the logged-in user's ID

    if (!responseData.response || responseData.response.trim() === "" || responseData.response === "AI responses fetched and saved successfully") {
      console.warn("Invalid response detected. It will not be saved to Firestore.");
      return;
    }

    const responsesCollection = collection(db, "responses");
    await addDoc(responsesCollection, {
      ...responseData,
      userId: userId, // Add userId to link the response to the current user
    });
    console.log("Response saved successfully:", responseData);
  } catch (error) {
    console.error("Error saving response:", error);
  }
}

// Function to check for existing responses
async function getResponsesByDateAndTitle(date, title) {
  const { db } = await initializeFirebase();
  const userId = await getCurrentUserId(); // Get the logged-in user's ID

  const responsesCollection = collection(db, "responses");
  const q = query(
    responsesCollection,
    where("userId", "==", userId), // Only fetch responses for the logged-in user
    where("date", "==", date),
    where("eventTitle", "==", title)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return doc.data(); // Return the existing response data
  }
  return null; // No response found
}

export { fetchEvents, saveEvent, fetchEventsForToday, saveResponse, getResponsesByDateAndTitle,auth };
