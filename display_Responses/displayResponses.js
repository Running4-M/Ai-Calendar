// Updated displayResponse.js
import { sendMessageToAI } from "./aiChatHandler.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db } from "../backend/firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth

document.addEventListener("DOMContentLoaded", async () => {
  const responseContainer = document.getElementById("responseContainer");
  const chatWindow = document.getElementById("chatWindow");
  const chatContent = document.getElementById("chatContent");
  const userMessage = document.getElementById("userMessage");
  const sendChatMessage = document.getElementById("sendChatMessage");
  const closeChatButton = document.getElementById("closeChatButton");

  let currentContext = "";
  let currentEventDate = "";
  const maxMessages = 10;
  const maxWords = 100;
  let messageCount = 0;

  const auth = getAuth();
  let userId = null;

  // Check if the user is authenticated
  const user = await new Promise((resolve) => onAuthStateChanged(auth, resolve));

  if (user) {
    userId = user.uid; // Get the userId from Firebase Authentication
  } else {
    alert("You need to log in first.");
    window.location.href = "../Login/login.html";
    return;
  }

  // Query Firestore for responses specific to the authenticated user
  const userResponsesQuery = query(collection(db, "responses"), where("userId", "==", userId));
  const querySnapshot = await getDocs(userResponsesQuery);
  const dateGroups = {};

  querySnapshot.forEach((doc) => {
    const { date, eventTitle, response } = doc.data();

    if (!dateGroups[date]) {
      dateGroups[date] = [];
    }
    dateGroups[date].push({ eventTitle, response });
  });

  // If no responses, display a "No responses yet" message
  if (Object.keys(dateGroups).length === 0) {
    const noResponsesMessage = document.createElement("div");
    noResponsesMessage.className = "no-responses-message";
    noResponsesMessage.style.fontSize = "2rem"; // Big font size
    noResponsesMessage.style.fontWeight = "bold";
    noResponsesMessage.textContent = "No responses to display";
    responseContainer.appendChild(noResponsesMessage);
  } else {
    // Render responses grouped by date
    Object.keys(dateGroups).forEach((date) => {
      const dateHeader = document.createElement("h2");
      dateHeader.className = "response-date";
      dateHeader.textContent = date;
      responseContainer.appendChild(dateHeader);

      dateGroups[date].forEach(({ eventTitle, response }) => {
        const card = document.createElement("div");
        card.className = "response-card";

        const titleElement = document.createElement("div");
        titleElement.className = "response-title";
        titleElement.textContent = eventTitle;

        const contentElement = document.createElement("div");
        contentElement.className = "response-content";
        contentElement.innerHTML = `
          ${convertMarkdownToHTML(response)}
          <button class="start-chat-button">Start Chat</button>
        `;

        card.appendChild(titleElement);
        card.appendChild(contentElement);
        responseContainer.appendChild(card);

        titleElement.addEventListener("click", () => {
          contentElement.style.display =
            contentElement.style.display === "none" ? "block" : "none";
        });

        // Start Chat Functionality
        contentElement.querySelector(".start-chat-button").addEventListener("click", () => {
          currentContext = response;
          currentEventDate = date;

          chatContent.innerHTML = `
            <h3 class="chat-date">${currentEventDate}</h3>
            <div class="ai-message">
              ${convertMarkdownToHTML(response)}
            </div>
          `;
          chatWindow.style.display = "flex";
          messageCount = 0; // Reset message count for new chat session
        });
      });
    });
  }

  // Chat Input Logic
  const sendMessage = async () => {
    const userText = userMessage.value.trim();
    if (!userText) return;

    // Check word limit
    const wordCount = userText.split(" ").length;
    if (wordCount > maxWords) {
      alert(`Message exceeds the maximum of ${maxWords} words.`);
      return;
    }

    // Check message count limit
    if (messageCount >= maxMessages) {
      alert("You have reached the maximum number of messages for this chat session.");
      return;
    }

    messageCount++;

    const userMsg = document.createElement("div");
    userMsg.className = "user-message";
    userMsg.innerHTML = userText;
    chatContent.appendChild(userMsg);
    userMessage.value = "";

    const loading = document.createElement("div");
    loading.className = "loading-indicator";
    loading.textContent = "AI is typing...";
    chatContent.appendChild(loading);

    try {
      const aiResponse = await sendMessageToAI(`${currentContext}\n${userText}`);
      currentContext += `\nYou: ${userText}\nAI: ${aiResponse}`;

      const aiMsg = document.createElement("div");
      aiMsg.className = "ai-message";
      aiMsg.innerHTML = convertMarkdownToHTML(aiResponse);
      chatContent.appendChild(aiMsg);
    } catch (error) {
      console.error("Error fetching AI response:", error);
    } finally {
      chatContent.removeChild(loading);
    }

    chatContent.scrollTop = chatContent.scrollHeight;
  };

  sendChatMessage.addEventListener("click", sendMessage);

  // Send message on Enter key press
  userMessage.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent newline
      sendMessage();
    }
  });

  closeChatButton.addEventListener("click", () => {
    chatWindow.style.display = "none";
    chatContent.innerHTML = "";
  });

  // Helper function to convert Markdown to HTML
  function convertMarkdownToHTML(markdown) {
    return markdown
      .replace(/#/g, "") // Remove heading markdown (e.g., ###)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold text
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italics
      .replace(/- (.*?)(\n|$)/g, "<li>$1</li>") // Bullet points
      .replace(/\n/g, "<br>") // Line breaks
      .replace(/<li>(.*?)<\/li>/g, "<ul><li>$1</li></ul>"); // Wrap bullet points in <ul>
  }

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

  document.getElementById("calendarButton").addEventListener("click", () => {
    window.location.href = "../Calendar/calendarMain.html"; // Adjust the path as needed
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

});
