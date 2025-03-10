import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9MoRFgajbAt58_s2zuW6vW6QKzpzUIbc",
  authDomain: "ai-calendar-5753a.firebaseapp.com",
  projectId: "ai-calendar-5753a",
  storageBucket: "ai-calendar-5753a.firebasestorage.app",
  messagingSenderId: "610949624500",
  appId: "1:610949624500:web:b63a91859c298bb0e7dde1",
  measurementId: "G-8JTTER2Z6T"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Function to get the current user's ID
function getCurrentUserId() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not logged in.");
  }
  return user.uid;
}

// Function to fetch events
async function fetchEvents() {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    const eventsCollectionRef = collection(db, "events");
    const q = query(eventsCollectionRef, where("userId", "==", userId)); // Ensure this filter is applied
    const querySnapshot = await getDocs(q);

    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return events;
  } catch (error) {
    console.error("Error fetching events: ", error);
    throw error;
  }
}

// Function to save event to Firestore
async function saveEvent(eventData) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    console.log("Saving event for userId:", userId); // Debugging line
    const eventsCollectionRef = collection(db, "events");
    const docRef = await addDoc(eventsCollectionRef, {
      ...eventData,
      userId: userId, // Add userId to link the event to the current user
    });
    console.log("Event added successfully with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error adding event: ", error.message);
    throw error;
  }
}

// Function to update an event in Firestore
async function updateEvent(eventId, updatedData) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    const eventDocRef = doc(db, "events", eventId);
    const eventSnapshot = await getDoc(eventDocRef);

    if (eventSnapshot.exists() && eventSnapshot.data().userId === userId) {
      // Only update if the event belongs to the logged-in user
      await updateDoc(eventDocRef, updatedData);
      console.log("Event updated successfully");
    } else {
      console.error("Unauthorized update attempt.");
    }
  } catch (error) {
    console.error("Error updating event: ", error.message);
    throw error;
  }
}

// Function to delete an event from Firestore
async function deleteEvent(eventId) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
    const eventDocRef = doc(db, "events", eventId);
    const eventSnapshot = await getDoc(eventDocRef);

    if (eventSnapshot.exists() && eventSnapshot.data().userId === userId) {
      // Only delete if the event belongs to the logged-in user
      await deleteDoc(eventDocRef);
      console.log("Event deleted successfully");
    } else {
      console.error("Unauthorized delete attempt.");
    }
  } catch (error) {
    console.error("Error deleting event: ", error.message);
    throw error;
  }
}

// Function to fetch events for a specific day
async function fetchEventsForToday(dateStr) {
  console.log("Fetching events for today:", dateStr); // Log the current date
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID
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

    console.log("Today's events fetched:", events); // Log fetched events
    return events;
  } catch (error) {
    console.error("Error fetching today's events:", error.message);
    return [];
  }
}

// Function to save a response to Firestore
async function saveResponse(responseData) {
  try {
    const userId = getCurrentUserId(); // Get the logged-in user's ID

    // Log the response to check what is being passed in responseData
    console.log("Response to save:", responseData.response);

    // Check if the response is valid (not a placeholder or empty)
    if (!responseData.response || responseData.response.trim() === "" || responseData.response === "AI responses fetched and saved successfully") {
      console.warn("Invalid response detected. It will not be saved to Firestore.");
      return; // Exit early if the response is invalid
    }

    // Reference the 'responses' collection
    const responsesCollection = collection(db, "responses");

    // Add a new document to the collection with the response data
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
  const userId = getCurrentUserId(); // Get the logged-in user's ID

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

export { fetchEvents, saveEvent, updateEvent, deleteEvent, fetchEventsForToday, saveResponse, db, getResponsesByDateAndTitle, auth };
