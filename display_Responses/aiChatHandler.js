import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth

const endpoint = "https://calendar-ai-backend.onrender.com/api/chat"; // Chat API endpoint

// Helper: Chat State to maintain context
const chatState = {
  userId: null, // User ID to identify the user
  messages: [], // Holds conversation context
};

// Helper: Fetch and set the userId
async function fetchUserId() {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user.uid); // Resolve with the user ID
      } else {
        reject("User is not logged in.");
      }
    });
  });
}

// Initialize chat with the first AI context
export async function initializeChat(aiResponseContext) {
  try {
    // Fetch and set userId
    if (!chatState.userId) {
      chatState.userId = await fetchUserId();
      console.log("User ID set:", chatState.userId);
    }

    // Set up system role with initial context if not already set
    if (chatState.messages.length === 0) {
      chatState.messages.push({
        role: "system",
        content: aiResponseContext || 
          "You are a helpful assistant that provides insightful suggestions based on user prompts.",
      });
    }

    console.log("Chat initialized with context:", JSON.stringify(chatState.messages, null, 2));
  } catch (error) {
    console.error("Error initializing chat:", error);
    throw error; // Propagate error to ensure issues are handled upstream
  }
}

// Helper: Send a message to the AI
async function sendMessageToModel(userMessage) {
  try {
    // Add the user's message to the conversation context
    chatState.messages.push({ role: "user", content: userMessage });

    // Prepare the API request body
    const requestBody = {
      userId: chatState.userId, // Include userId in the request
      userMessage,
      conversationHistory: chatState.messages, // Send the complete conversation history
    };

    console.log("Sending to backend:", JSON.stringify(requestBody, null, 2));

    // Make the request to the backend
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AI response: ${response.statusText}`);
    }

    const aiMessage = await response.json();

    // Add the AI response to the conversation context
    chatState.messages.push({ role: "system", content: aiMessage.content });

    return aiMessage.content;
  } catch (error) {
    console.error("Error in sendMessageToModel:", error);
    throw error;
  }
}

// Exported function to interact with the AI
export async function sendMessageToAI(userMessage) {
  try {
    return await sendMessageToModel(userMessage);
  } catch (error) {
    console.error("Error in chat interaction:", error);
    throw error;
  }
}
