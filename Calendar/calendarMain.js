import { Timestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { fetchEvents, saveEvent, updateEvent, deleteEvent, fetchEventsForToday, saveResponse, getResponsesByDateAndTitle, db } from "../backend/firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth
import { fetchChatGPTResponse } from "../AI/chatgpt.js"; // Import the AI response function
let selectedEvent = null;
document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const deleteButton = document.getElementById("deleteEvent"); // Ensure this ID matches your delete button
  // Initialize Firebase Authentication
  const auth = getAuth();
  let userId = null;
  // Check for authentication state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      userId = user.uid;
    } else {
      // No user is signed in
      alert("You need to log in first.");
      window.location.href = "../Login/login.html";
      return;
    }
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      selectable: true,
      editable: true, // Allows drag-and-drop
      events: async (info, successCallback, failureCallback) => {
        try {
          if (!userId) {
            throw new Error("User not authenticated.");
          }
          const events = await fetchEvents(); // You no longer need to pass userId, as it's handled inside fetchEvents
          successCallback(events);
        } catch (error) {
          console.error("Error fetching events: ", error.message);
          failureCallback(error);
        }
      },
      // Handle creating new events
      dateClick: function (info) {
        selectedEvent = null;
        document.querySelector("#eventTitle").value = "";
        document.querySelector("#eventDate").value = info.dateStr;
        document.querySelector("#aiType").value = "";
        document.querySelector("#taskDetails").value = "";
        deleteButton.style.display = "none";
        document.querySelector("#eventModal").style.display = "block";
      },
      // Handle event click (edit/delete event)
      eventClick: function (info) {
        const clickedEvent = info.event;
        selectedEvent = {
          id: clickedEvent.id,
          title: clickedEvent.title,
          date: clickedEvent.start,
          aiType: clickedEvent.extendedProps.aiType,
          description: clickedEvent.extendedProps.description,
        };
        document.querySelector("#eventTitle").value = selectedEvent.title;
        document.querySelector("#eventDate").value = selectedEvent.date.toISOString().slice(0, 10);
        document.querySelector("#aiType").value = selectedEvent.aiType || "brainstorm";
        document.querySelector("#taskDetails").value = selectedEvent.description;
        deleteButton.style.display = "block";
        document.querySelector("#eventModal").style.display = "block";
      },
      // Handle drag-and-drop to update event dates
      eventDrop: async (info) => {
        const droppedEvent = info.event;
        try {
          const updatedEvent = {
            title: droppedEvent.title,
            date: droppedEvent.start.toISOString().slice(0, 10),
            aiType: droppedEvent.extendedProps.aiType || "brainstorm",
            description: droppedEvent.extendedProps.description || "",
          };
          await updateEvent(droppedEvent.id, updatedEvent);
          alert("Event updated successfully after drag-and-drop!");
        } catch (error) {
          console.error("Error updating event on drag-and-drop: ", error.message);
          alert("Failed to update the event. Please try again.");
          info.revert(); // Revert the event to its original position on failure
        }
      },
    });
    calendar.render();
    // Save button functionality
    document.querySelector("#saveEvent").addEventListener("click", async () => {
      const title = document.querySelector("#eventTitle").value;
      const date = document.querySelector("#eventDate").value;
      const aiType = document.querySelector("#aiType").value;
      const description = document.querySelector("#taskDetails").value;
      const eventData = { title, date, aiType, description, userId }; // Include userId
      try {
        if (selectedEvent && selectedEvent.id) {
          await updateEvent(selectedEvent.id, eventData);
          alert("Event updated successfully!");
        } else {
          await saveEvent(eventData);
          alert("Event added successfully!");
        }
        const events = await fetchEvents(userId); // Fetch events by user ID
        calendar.removeAllEvents();
        calendar.addEventSource(events);
        document.querySelector("#eventModal").style.display = "none";
      } catch (error) {
        console.error("Error saving event: ", error.message);
        alert("Failed to save event. Please try again.");
      }
    });
    // Delete button functionality
    deleteButton.addEventListener("click", async () => {
      if (!selectedEvent || !selectedEvent.id) return;
      const confirmDelete = confirm("Are you sure you want to delete this event?");
      if (confirmDelete) {
        try {
          await deleteEvent(selectedEvent.id);
          calendar.getEventById(selectedEvent.id).remove();
          document.querySelector("#eventModal").style.display = "none";
          alert("Event deleted successfully!");
        } catch (error) {
          console.error("Error deleting event: ", error.message);
          alert("Failed to delete event. Please try again.");
        }
      }
    });
    document.querySelector("#closeModal").addEventListener("click", () => {
      document.querySelector("#eventModal").style.display = "none";
    });
    // Process AI Responses for today's events
    const today = new Date().toISOString().slice(0, 10);
    try {
      const todaysEvents = await fetchEventsForToday(today, userId); // Pass userId for filtering
      for (const event of todaysEvents) {
        const existingResponse = await getResponsesByDateAndTitle(event.date, event.title, userId); // Filter by userId
        if (!existingResponse) {
          const prompt = `Task: ${event.title}\nDetails: ${event.description}\nAI Type: ${event.aiType}`;
          const response = await fetchChatGPTResponse(prompt);
          await saveResponse({
            date: event.date,
            eventTitle: event.title,
            response: response,
            userId, // Associate response with userId
          });
        } else {
          console.log(`Response already exists for event "${event.title}"`);
        }
      }
    } catch (error) {
      console.error("Error processing AI responses: ", error.message);
    }
  });
  const chatgptResponsesButton = document.getElementById("chatgptResponsesButton");
  // Add click event listener to the button
  chatgptResponsesButton.addEventListener("click", () => {
    // Redirect to chatgpt_Responses.html
    window.location.href = "../display_Responses/chatgpt_Response.html";
  });
  // Toggle menu visibility
  document.getElementById("menuButton").addEventListener("click", () => {
    const menuOptions = document.getElementById("menuOptions");
    menuOptions.style.display = menuOptions.style.display === "none" ? "block" : "none";
  });
  // Handle logout
  document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("You have been logged out.");
      window.location.href = "../Login/login.html"; // Redirect to login page
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to log out. Please try again.");
    }
  });
  const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("closeSidebar");
const overlay = document.getElementById("overlay");
const userIcon = document.querySelector(".user-icon"); // Select the user icon
const helpButton = document.getElementById("helpButton"); // Select the help button
// Open the sidebar
menuButton.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("visible");
  userIcon.classList.add("hidden"); // Hide the user icon
});
// Close the sidebar
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("visible");
  userIcon.classList.remove("hidden"); // Show the user icon
});
// Close the sidebar when clicking the overlay
overlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("visible");
  userIcon.classList.remove("hidden"); // Show the user icon
});
// Redirect to the help page when the help button is clicked
helpButton.addEventListener("click", () => {
  window.location.href = "../help/help.html"; // Redirect to the help page
});
  function showTaskPopup() {
  const taskPopup = document.getElementById('taskPopup');
  const currentDate = new Date();
  const currentHour = currentDate.getHours();

  // Get the user's events for today
  fetchEventsForToday().then(events => {
    const taskCompleted = events.some(event => event.completed); // Assume 'completed' is a field in the event

    // Show the popup if there are no completed tasks
    if (!taskCompleted) {
      taskPopup.style.display = 'block';
      // Show the question
      document.getElementById('popupQuestion').innerText = "Have you completed today's task?";

      // Handle button actions
      document.getElementById('completeTaskButton').onclick = function() {
        document.getElementById('popupQuestion').innerText = "Great job! Keep it up!";
        document.getElementById('complimentText').innerText = "Well done! Here's a motivational quote: 'Success is the sum of small efforts, repeated day in and day out.'";
      };

      document.getElementById('rescheduleTaskButton').onclick = function() {
        document.getElementById('popupQuestion').innerText = "You can reschedule the task for a later time.";
        document.getElementById('complimentText').innerText = "";  // No compliment if they reschedule
      };

      document.getElementById('askForHelpButton').onclick = function() {
        document.getElementById('popupQuestion').innerText = "Opening a chat with AI to help you complete the task.";
        // Redirect to the responses page and automatically open the chat for that event
        window.location.href = '/responses.html'; // Ensure the event is passed or retrieved correctly to start the chat
      };
    }
  });
}

// Check events for today and when the popup should show up (e.g., show after 12 PM or the next day)
function fetchEventsForToday() {
  return new Promise((resolve, reject) => {
    const userId = getUserId(); // Make sure to get the logged-in user's ID
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Fetch events for today from Firebase or any backend
    firebase.firestore().collection('events')
      .where('userId', '==', userId)
      .where('date', '==', today)
      .get()
      .then(snapshot => {
        const events = snapshot.docs.map(doc => doc.data());
        resolve(events);
      })
      .catch(err => {
        console.error('Error fetching events:', err);
        reject(err);
      });
  });
}

// Get the logged-in user's ID (you may already have this part in place)
function getUserId() {
  // Placeholder for actual user ID logic (like Firebase Auth)
  return 'someUserId'; 
}

// Trigger the popup on login or after some delay
showTaskPopup();
  
});
