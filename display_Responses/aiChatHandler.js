import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; // Import Firebase Auth
import { initializeUserId, getUserId } from "../backend/sharedAuthHelper.js"; // Import sharedAuthHelper.js

const endpoint = "https://calendar-ai-backend.onrender.com/api/chat"; // Chat API endpoint

// Helper: Chat State to maintain context
const chatState = {
  userId: null, // User ID to identify the user
  messages: [], // Holds conversation context
};

// Initialize chat with the first AI context
export async function initializeChat(aiResponseContext) {
  try {
    // Initialize userId using sharedAuthHelper.js
    if (!chatState.userId) {
      console.log("Fetching userId using sharedAuthHelper...");
      await initializeUserId(); // Fetch and set the userId globally
      chatState.userId = getUserId(); // Retrieve the fetched userId
      console.log("User ID fetched and set:", chatState.userId);
    }

    if (!chatState.userId) {
      console.error("User ID is null. Chat cannot proceed.");
      return;
    }

    // Set up the initial system message if chatState.messages is empty
    if (chatState.messages.length === 0) {
      chatState.messages.push({
        role: "system",
        content: aiResponseContext || 
          "You are a helpful assistant that provides insightful suggestions based on user prompts.",
      });
    }
    console.log("Chat initialized with context:", JSON.stringify(chatState.messages, null, 2));
  } catch (error) {
    console.error("Error in initializeChat:", error);
  }
}

// Helper: Send a message to the AI
async function sendMessageToModel(userMessage) {
  try {
    if (!chatState.userId) {
      console.error("Cannot send message: userId is null.");
      throw new Error("User ID is not set.");
    }

    chatState.messages.push({ role: "user", content: userMessage });

    const requestBody = {
      userId: chatState.userId,
      userMessage,
      conversationHistory: chatState.messages,
    };

    console.log("Request payload:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${errorText}`);
      throw new Error(`Failed to fetch AI response: ${response.statusText}`);
    }

    const aiMessage = await response.json();
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
