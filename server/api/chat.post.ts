// POST /api/chat
// Runs only on the server, so the OpenAI key never reaches the browser.
import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
  // Reads OPENAI_API_KEY from .env automatically.
  // Created inside the handler so a missing key only breaks this route,
  // not the whole site.
  const openai = new OpenAI()

  // The chat history sent from app.vue: [{ id, message, sender }, ...]
  const { chats } = await readBody(event)

  const response = await openai.responses.create({
    model: 'gpt-5.5',
    // How the AI should behave (like a system prompt)
    instructions: 'You are a friendly job interviewer. Keep your replies short.',
    // The conversation so far. Your "user" messages stay "user";
    // the interviewer's messages are the AI's own ("assistant").
    input: chats.map((chat: { message: string; sender: string }) => ({
      role: chat.sender === 'user' ? 'user' : 'assistant',
      content: chat.message,
    })),
  })

  // output_text is the AI's whole reply as plain text
  return { message: response.output_text }
})
