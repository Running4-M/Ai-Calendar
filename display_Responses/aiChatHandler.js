import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth
import { sendMessageToServer } from "../backend/server.js"; // Replace with your actual server request function

// Track the current userId
let userId = null;

// Initialize Firebase Authentication and check authentication state
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (user) {
    userId = user.uid; // Assign the authenticated user's ID
  } else {
    alert("You need to log in first.");
    window.location.href = "../Login/login.html"; // Redirect to login page
  }
});

// Function to handle sending messages to the AI
async function handleUserMessage(message) {
  if (!userId) {
    console.error("User not authenticated.");
    return;
  }

  const payload = {
    userId, // Include userId in the payload
    userMessage: message,
  };

  try {
    const response = await sendMessageToServer(payload); // Send the request to the server
    displayChatResponse(response); // Function to display the AI's response in the UI
  } catch (error) {
    console.error("Error sending message to the server:", error.message);
    alert("Failed to get a response. Please try again.");
  }
}

// Example of a function to send a message from the UI
document.getElementById("sendButton").addEventListener("click", () => {
  const userMessage = document.getElementById("userInput").value;
  if (userMessage) {
    handleUserMessage(userMessage);
  }
});

// Function to display chat responses in the UI
function displayChatResponse(response) {
  const chatBox = document.getElementById("chatBox");
  const responseElement = document.createElement("div");
  responseElement.className = "response";
  responseElement.textContent = response;
  chatBox.appendChild(responseElement);
}

export { handleUserMessage }; // Export for testing or other uses

}
