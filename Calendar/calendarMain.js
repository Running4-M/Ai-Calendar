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
// Show the popup asking about task completion
function showTaskPopup() {
  const taskPopup = document.getElementById('taskPopup');
  const completeButton = document.getElementById('completeTaskButton');
  const rescheduleButton = document.getElementById('rescheduleTaskButton');
  const askForHelpButton = document.getElementById('askForHelpButton');
  const popupQuestion = document.getElementById('popupQuestion');
  const complimentText = document.getElementById('complimentText');

  // Display the popup with the task completion question
  taskPopup.style.display = 'block';
  popupQuestion.innerText = "Have you completed today's task?";

  // Handle 'Complete Task' button click
  completeButton.onclick = function() {
    const quotes = [
      "Well done! Keep going, you're doing great!",
      "Success is the sum of small efforts, repeated day in and day out.",
      "The way to get started is to quit talking and begin doing.",
      "Believe in yourself! Every accomplishment starts with the decision to try."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]; // Random quote from the list
    popupQuestion.innerText = "Great job!";
    complimentText.innerText = randomQuote;
  };

  // Handle 'Reschedule Task' button click
  rescheduleButton.onclick = function() {
    popupQuestion.innerText = "You can reschedule the task for a later time.";
    complimentText.innerText = "Don't forget to update your event in the calendar if you haven't already!";
  };

  // Handle 'Ask for Help' button click
  askForHelpButton.onclick = function() {
    popupQuestion.innerText = "You haven't completed your task yet. Please go to your tasks and click 'Start Chat' to get help.";
    complimentText.innerText = ""; // No compliment if they haven't completed the task
    // Redirect to the responses page (make sure the event ID or title is passed in the URL if needed)
    window.location.href = '/responses.html'; // You can modify this URL if necessary to pass context
  };
}

// Close the popup (optional: could be called after a button click or other action)
function closePopup() {
  const taskPopup = document.getElementById('taskPopup');
  taskPopup.style.display = 'none';
}

// Show the popup after a delay or on page load
window.addEventListener('load', () => {
  const now = new Date();
  const currentTime = now.getHours(); // Get the current hour
  
  // Set a delay to show the popup after a few hours (e.g., after 12 PM or next day)
  if (currentTime >= 12) {
    showTaskPopup(); // Show the task completion popup
  }
});
  
});
