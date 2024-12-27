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
  const completeTaskButton = document.getElementById('completeTaskButton');
  const rescheduleTaskButton = document.getElementById('rescheduleTaskButton');
  const askForHelpButton = document.getElementById('askForHelpButton');
  const okButton = document.getElementById('okButton');
  const laterButton = document.getElementById('laterButton');
  const popupDate = document.getElementById('popupDate');
  const popupQuestion = document.getElementById('popupQuestion');
  const complimentText = document.getElementById('complimentText');
  const popupButtons = document.getElementById('popupButtons');
  const secondaryButtons = document.getElementById('secondaryButtons');
  const helpDescription = document.getElementById('helpDescription');

  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = yesterday.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Set date in the popup
  popupDate.innerText = `Have you completed your events for ${formattedDate}?`;

  // Display the popup
  taskPopup.style.display = 'flex';

  // Handle "Yes, I completed them!" button
  completeTaskButton.onclick = function () {
    complimentText.innerText =
      "Great job! Here's some motivation: 'Success is not final, failure is not fatal: it is the courage to continue that counts.'";
    popupButtons.style.display = 'none';
    popupDate.style.display = 'none'; // Hide the question
    setTimeout(() => {
      taskPopup.style.display = 'none';
    }, 2000);
  };

  // Handle "I rescheduled them" button
  rescheduleTaskButton.onclick = function () {
    complimentText.innerText =
      'Friendly reminder: please update the event in the calendar if you have not already!';
    popupButtons.style.display = 'none';
    popupDate.style.display = 'none'; // Hide the question
    setTimeout(() => {
      taskPopup.style.display = 'none';
    }, 2000);
  };

  // Handle "No, I need help" button
  askForHelpButton.onclick = function () {
    // Hide the initial buttons and show the secondary buttons
    popupButtons.style.display = 'none';
    popupDate.style.display = 'none'; // Hide the question
    secondaryButtons.style.display = 'flex';
    helpDescription.style.display = 'block';
  };

  // Handle "OK" button in secondary popup
  okButton.onclick = function () {
    window.location.href = '../display_Responses/chatgpt_Response.html';
  };

  // Handle "I'll do it later" button
  laterButton.onclick = function () {
    taskPopup.style.display = 'none';
  };
}

// Show popup only once per day
window.addEventListener('load', () => {
  const popupShownKey = 'popupShownDate';
  const todayDate = new Date().toDateString(); // Get today's date as a string

  // Check localStorage to see if the popup was already shown today
  const lastShownDate = localStorage.getItem(popupShownKey);

  if (lastShownDate !== todayDate) {
    // Show the popup and update localStorage
    showTaskPopup();
    localStorage.setItem(popupShownKey, todayDate);
  }
});
  
});
