const endpoint = "https://calendar-ai-backend.onrender.com/api/chat"; // Updated endpoint for chat completions

// Helper: Send a message to the GPT-4 model
const chatState = {
  conversationId: null, 
  messages: [], // Array to hold conversation context
};

async function sendMessageToModel(userMessage) {
  // Add user message to context
  chatState.messages.push({ role: "user", content: userMessage });

  // Request API key from your backend (this should be set securely)
  const apiKeyResponse = await fetch("https://calendar-ai-backend.onrender.com/api/getChatApiKey"); // Updated to fetch chat API key

  if (!apiKeyResponse.ok) {
    throw new Error("Failed to fetch API key.");
  }
  const { apiKey } = await apiKeyResponse.json();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`, // Use API key securely
    },
    body: JSON.stringify({
      messages: chatState.messages, // Send full conversation context
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
  const data = await response.json();

  // Add AI response to context
  const aiMessage = data.choices[0].message;
  chatState.messages.push(aiMessage);

  return aiMessage.content;
}

// Exported function to send user messages and get the response
export async function sendMessageToAI(userMessage) {
  try {
    const response = await sendMessageToModel(userMessage);
    return response; // Return the response from GPT-4
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
}

// Initialize chat with context
export function initializeChat(responseContext) {
  console.log("Chat initialized with context:", responseContext);
}
