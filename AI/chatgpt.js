import { fetchEventsForToday, saveResponse, getResponsesByDateAndTitle } from "../backend/firebase.js";

async function fetchChatGPTResponse() {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  console.log("Fetching events for today:", today);

  try {
    // Fetch events for today from Firestore using the 'date' field
    const eventsForToday = await fetchEventsForToday(today);

    if (eventsForToday.length === 0) {
      console.log("No events for today.");
      return "No events scheduled for today.";
    }

    // Loop through each event and process
    for (const event of eventsForToday) {
      const eventData = {
        title: event.title,
        date: event.date,
        description: event.description,
        aiType: event.aiType,
      };

      // Log the event data to verify
      console.log("Checking for existing response for event:", eventData);

      // Check if a response already exists for the event
      const existingResponse = await getResponsesByDateAndTitle(eventData.date, eventData.title);

      if (existingResponse) {
        console.log("Response already exists for this event today. Skipping save:", existingResponse.response);
        continue; // Skip saving and move to the next event
      }

      // If no existing response, send the event data to OpenAI
      console.log("Sending event data to OpenAI:", eventData);
      const assistantResponse = await sendToOpenAI(eventData);

      // Validate the assistant's response
      if (!assistantResponse || assistantResponse.trim() === "" || assistantResponse === "AI responses fetched successfully") {
        console.warn("Invalid or placeholder response received. Skipping save for this event.");
        continue; // Skip saving invalid responses
      }

      // Save the AI-generated response to Firebase
      const responseData = {
        date: eventData.date,
        eventTitle: eventData.title,
        response: assistantResponse,
      };

      console.log("Saving response to Firebase:", responseData);
      await saveResponse(responseData); // Save the valid AI response to Firebase
    }

  } catch (error) {
    console.error("Error fetching today's events or API response:", error.message);
    return "Sorry, something went wrong. Please try again later.";
  }
}

async function sendToOpenAI(eventData) {
  // Fetch the API key from your backend
  const apiKeyResponse = await fetch("https://calendar-ai-backend.onrender.com/api/getApiKey");

  if (!apiKeyResponse.ok) {
    throw new Error("Failed to fetch API key.");
  }

  const { apiKey } = await apiKeyResponse.json(); // Get the API key from the response
  const openaiUrl = "https://calendar-ai-backend.onrender.com/api/calendar"; // Updated to Render backend URL

  const response = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`, // Use the API key here
    },
    body: JSON.stringify({
      eventData: eventData, // Send the event data directly to the backend
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error from OpenAI API:", error);
    throw new Error("Failed to fetch response from OpenAI");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export { fetchChatGPTResponse };
