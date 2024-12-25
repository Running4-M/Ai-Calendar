const endpoint = "https://calendar-ai-backend.onrender.com/api/chat"; // Updated endpoint for chat completions

// Helper: Send a message to the GPT-4 model
const chatState = {
  conversationId: null,
  messages: [], // Array to hold conversation context
};

// Initialize chat with context
export function initializeChat(aiResponseContext) {
  if (chatState.messages.length === 0) {
    // Add the AI response from the calendar as the initial context
    chatState.messages.push({
      role: "system",
      content: aiResponseContext || "You are a helpful assistant that provides insightful suggestions based on user prompts.",
    });
  }
  console.log("Chat initialized with context:", JSON.stringify(chatState.messages, null, 2));
}

async function sendMessageToModel(userMessage) {
  try {
    // Add user message to context
    chatState.messages.push({ role: "user", content: userMessage });

    // Log the conversation context to see the structure of messages
    console.log("Conversation Context:", JSON.stringify(chatState.messages, null, 2));

    // Request API key from your backend
    const apiKeyResponse = await fetch("https://calendar-ai-backend.onrender.com/api/getChatApiKey");
    if (!apiKeyResponse.ok) {
      console.error("Failed to fetch API key. Status:", apiKeyResponse.status);
      throw new Error("Failed to fetch API key.");
    }
    const { apiKey } = await apiKeyResponse.json();

    // Prepare the request body with user and system roles explicitly defined
    const requestBody = {
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: chatState.messages,
    };

    // Log the request body before sending the request
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`, // Use API key securely
      },
      body: JSON.stringify(requestBody),
    });

    // Log the response status and body
    console.log("Response Status:", response.status);
    const responseBody = await response.json();
    console.log("Response Body:", JSON.stringify(responseBody, null, 2));

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    // Add AI response to context
    const aiMessage = responseBody;
    chatState.messages.push({ role: "system", content: aiMessage.content });

    return aiMessage.content;
  } catch (error) {
    console.error("Error in sendMessageToModel:", error);
    throw error;
  }
}

// Exported function to send user messages and get the response
export async function sendMessageToAI(userMessage) {
  try {
    const response = await sendMessageToModel(userMessage);
    return response;
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
}
