const endpoint = "https://calendar-ai-backend.onrender.com/api/chat"; // Chat API endpoint

// Helper: Chat State to maintain context
const chatState = {
  messages: [], // Holds conversation context
};

// Initialize chat with the first AI context
export function initializeChat(aiResponseContext) {
  if (chatState.messages.length === 0) {
    // Set up system role with initial context
    chatState.messages.push({
      role: "system",
      content: aiResponseContext || "You are a helpful assistant that provides insightful suggestions based on user prompts.",
    });
  }
  console.log("Chat initialized with context:", JSON.stringify(chatState.messages, null, 2));
}

// Helper: Send a message to the AI
async function sendMessageToModel(userMessage) {
  try {
    // Add the user's message to the conversation context
    chatState.messages.push({ role: "user", content: userMessage });

    // Prepare the API request body
    const requestBody = {
      userMessage,
      conversationHistory: chatState.messages, // Send the complete conversation history
    };

    console.log("Sending to backend:", JSON.stringify(requestBody, null, 2));

    // Make the request to the backend
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
