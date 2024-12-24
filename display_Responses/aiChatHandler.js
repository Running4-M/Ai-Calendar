const endpoint = "https://calendar-ai-backend.onrender.com/api/chat"; // Updated endpoint for chat completions

// Helper: Send a message to the GPT-4 model
const chatState = {
  conversationId: null, 
  messages: [], // Array to hold conversation context
};

async function sendMessageToModel(userMessage) {
  // Add user message to context
  chatState.messages.push({ role: "user", content: userMessage });

  // Log the conversation context to see the structure of messages
  console.log("Conversation Context:", JSON.stringify(chatState.messages, null, 2));

  // Request API key from your backend (this should be set securely)
  const apiKeyResponse = await fetch("https://calendar-ai-backend.onrender.com/api/getChatApiKey"); // Updated to fetch chat API key

  if (!apiKeyResponse.ok) {
    throw new Error("Failed to fetch API key.");
  }
  const { apiKey } = await apiKeyResponse.json();

  // Log the API key to ensure it's being fetched correctly (avoid logging in production)
  console.log("API Key fetched:", apiKey);

  // Prepare the request body to be sent to OpenAI's API
  const requestBody = {
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: chatState.messages, // Send full conversation context
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

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
  const data = await response.json();

  // Log the AI response to ensure it's properly formatted
  console.log("AI Response:", data);

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
