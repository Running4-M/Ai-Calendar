import { Timestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { fetchEvents, saveEvent, updateEvent, deleteEvent, fetchEventsForToday, saveResponse, getResponsesByDateAndTitle, db } from "../backend/firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth
import { fetchChatGPTResponse } from "../AI/chatgpt.js"; // Import the AI response function

let selectedEvent = null;
document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const deleteButton = document.getElementById("deleteEvent");
  const completeButton = document.getElementById("completeTask"); // Add a button for marking the task as completed

  // Initialize Firebase Authentication
  const auth = getAuth();
  let userId = null;

  // Check for authentication state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;
    } else {
      alert("You need to log in first.");
      window.location.href = "../Login/login.html";
      return;
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      selectable: true,
      editable: true,
      events: async (info, successCallback, failureCallback) => {
        try {
          if (!userId) throw new Error("User not authenticated.");
          const events = await fetchEvents();
          successCallback(events);
        } catch (error) {
          console.error("Error fetching events: ", error.message);
          failureCallback(error);
        }
      },

      dateClick: function (info) {
        selectedEvent = null;
        document.querySelector("#eventTitle").value = "";
        document.querySelector("#eventDate").value = info.dateStr;
        document.querySelector("#aiType").value = "";
        document.querySelector("#taskDetails").value = "";
        completeButton.style.display = "none"; // Hide task completed button when creating a new event
        deleteButton.style.display = "none";  // Hide delete button
        document.querySelector("#eventModal").style.display = "block";
      },

      eventClick: function (info) {
        const clickedEvent = info.event;
        selectedEvent = {
          id: clickedEvent.id,
          title: clickedEvent.title,
          date: clickedEvent.start,
          aiType: clickedEvent.extendedProps.aiType,
          description: clickedEvent.extendedProps.description,
          completed: clickedEvent.extendedProps.completed, // Store completion status
        };
        document.querySelector("#eventTitle").value = selectedEvent.title;
        document.querySelector("#eventDate").value = selectedEvent.date.toISOString().slice(0, 10);
        document.querySelector("#aiType").value = selectedEvent.aiType || "brainstorm";
        document.querySelector("#taskDetails").value = selectedEvent.description;
        completeButton.style.display = "block"; // Show the task completed button
        deleteButton.style.display = "block";  // Show delete button
        document.querySelector("#eventModal").style.display = "block";
      },

      eventDrop: async (info) => {
        const droppedEvent = info.event;
        try {
          const updatedEvent = {
            title: droppedEvent.title,
            date: droppedEvent.start.toISOString().slice(0, 10),
            aiType: droppedEvent.extendedProps.aiType || "brainstorm",
            description: droppedEvent.extendedProps.description || "",
            completed: droppedEvent.extendedProps.completed || false, // Maintain completion status
          };
          await updateEvent(droppedEvent.id, updatedEvent);
          alert("Event updated successfully after drag-and-drop!");
        } catch (error) {
          console.error("Error updating event on drag-and-drop: ", error.message);
          alert("Failed to update the event. Please try again.");
          info.revert();
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
      const eventData = { title, date, aiType, description, userId };

      try {
        if (selectedEvent && selectedEvent.id) {
          await updateEvent(selectedEvent.id, eventData);
          alert("Event updated successfully!");
        } else {
          await saveEvent(eventData);
          alert("Event added successfully!");
        }
        const events = await fetchEvents(userId);
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

    // Task Completed button functionality (now deletes event and shows popup)
    completeButton.addEventListener("click", async () => {
      if (!selectedEvent || !selectedEvent.id) return;
      try {
        // Delete the event (similar to delete button)
        await deleteEvent(selectedEvent.id);
        calendar.getEventById(selectedEvent.id).remove();
        document.querySelector("#eventModal").style.display = "none";

        // Show green "Well done!" popup
        const popup = document.createElement("div");
        popup.textContent = "Well done with task completed!";
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.backgroundColor = "green";
        popup.style.color = "white";
        popup.style.padding = "20px";
        popup.style.fontSize = "20px";
        popup.style.borderRadius = "5px";
        popup.style.zIndex = "9999";
        document.body.appendChild(popup);

        // Remove the popup after 3 seconds
        setTimeout(() => {
          popup.remove();
        }, 3000);
      } catch (error) {
        console.error("Error marking task as completed: ", error.message);
        alert("Failed to mark the task as completed. Please try again.");
      }
    });

    // Close modal
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
  // Get elements from the DOM
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("closeSidebar");
const overlay = document.getElementById("overlay");
const helpButton = document.getElementById("helpButton");

// Toggle sidebar visibility when menu button is clicked
menuButton.addEventListener("click", () => {
  sidebar.classList.add("open"); // Add the open class
  overlay.style.display = "block"; // Show the overlay
});

// Close the sidebar when the close button is clicked
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open"); // Remove the open class
  overlay.style.display = "none"; // Hide the overlay
});

// Close the sidebar when clicking the overlay
overlay.addEventListener("click", () => {
  sidebar.classList.remove("open"); // Remove the open class
  overlay.style.display = "none"; // Hide the overlay
});

// Redirect to the help page when the help button is clicked
helpButton.addEventListener("click", () => {
  window.location.href = "../help/help.html"; // Redirect to the help page
});
  
});
