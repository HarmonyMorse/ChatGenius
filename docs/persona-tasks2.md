```markdown:docs/avatar-tasks2.md
# Step-by-Step: Building an AI Avatar Feature

Below is a guide on how to implement an AI “digital twin” or avatar feature for your chat application, leveraging LangChain, Pinecone, and the OpenAI API to create and store a “persona” that can respond on behalf of a specific user.

---

## Overview

1. Users generate a “persona” based on their existing chat history (to capture their style and tone).  
2. That persona is stored in the database, either:
   - In the Users table (one-to-one: each user has one column storing the persona data), or
   - In a dedicated table (e.g., persona) that can store multiple personas or more detailed metadata.  
3. When another user wants to talk to the AI persona, they call an endpoint that retrieves that persona and instructs the AI to respond “as” the user.  
4. Optionally, embed the user’s entire message history to allow additional context retrieval via Pinecone.

This process is similar in spirit to the checklists shown in:
- docs/message-analysis-tasks.md  
- docs/rag-tasks.md  

Follow them for best practices around embedding data, creating APIs, and using LangChain effectively.

---

## 1. Create or Modify the Database Schema

Decide how you want to store each user’s persona data. You can either:

1. Add columns to your existing Users table, e.g.:
   - persona_description (TEXT)
   - persona_settings (JSONB)
   - persona_embedding_id (TEXT or UUID for referencing Pinecone vectors)

2. Create a new table (recommended for flexibility), for example persona:
   ```sql
   CREATE TABLE IF NOT EXISTS persona (
       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       user_id UUID REFERENCES users(id) ON DELETE CASCADE,
       persona_name TEXT NOT NULL,
       persona_description TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   CREATE OR REPLACE FUNCTION update_persona_updated_at()
   RETURNS TRIGGER AS $$
       BEGIN
           NEW.updated_at = CURRENT_TIMESTAMP;
           RETURN NEW;
       END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER update_persona_updated_at
       BEFORE UPDATE ON persona
       FOR EACH ROW
       EXECUTE FUNCTION update_persona_updated_at();
   ```
   
Storing persona data in a separate table can be useful if you plan to have multiple personas per user or store more advanced metadata.

---

## 2. Install Necessary Packages

In your server directory, install/update the relevant packages:

```bash:docs/avatar-tasks2.md
npm install @langchain/openai @langchain/pinecone @pinecone-database/pinecone dotenv node-fetch
```

You likely already have express, supabase, etc. If you plan to handle any client-side AI calls (rare), you could also do:

```bash
npm install @langchain/react
```

---

## 3. Summarize a User’s Chat History to Form the Persona

### 3.1. Retrieve a User’s Chat Messages

Implement or reuse a function that queries your database (e.g., Supabase) for all recent messages by a given user:

```javascript
// pseudo-code
async function fetchUserMessages(userId) {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('sender_id', userId);

  if (error) throw error;
  return messages;
}
```

### 3.2. Summarize Style and Personality

1. Concatenate or selectively sample the user’s messages to feed into an OpenAI prompt that asks for a descriptive summary of their style, tone, and topics.  
2. Store that summary in persona_description. For example:

```javascript
// pseudo-code for summarizing a user’s style
async function generateUserPersonaDescription(allMessages) {
  const textSample = allMessages.map(m => m.content).join('\n\n');
  
  // Call your LLM prompt:
  const messages = [
    {
      role: 'system',
      content: 'You are an AI that summarizes the style of a user based on their chat messages.'
    },
    {
      role: 'user',
      content: `Analyze these messages and describe the user's writing style, tone, common topics, and any notable quirks:\n\n${textSample}`
    }
  ];

  // Use your ChatOpenAI or LLM wrapper
  const response = await chatOpenAI.invoke(messages);
  return response.content; // a text summary
}
```

3. Insert/update that text in either the user table or persona table.

---

## 4. Embedding the Persona in Pinecone

Optionally, so that you can do retrieval-based context later, embed that persona description into Pinecone. This mirrors the steps in your RAG approach (see docs/rag-tasks.md).

1. Use your existing embeddings logic:
   ```javascript
   // Example pseudo-code for embedding a persona
   async function embedPersona(personaDescription, personaId) {
     const vector = await embeddings.embedQuery(personaDescription);
     await pineconeIndex.upsert([
       {
         id: `persona_${personaId}`,
         values: vector,
         metadata: {
           persona_id: personaId,
           text: personaDescription
         }
       }
     ]);
   }
   ```
2. Store the Pinecone ID or metadata in your DB record for easy reference.

---

## 5. Generating AI Responses “As” the User

When other users want to chat with the AI avatar, do the following:

1. Retrieve the persona record from the database:
   ```javascript
   // pseudo-code
   const persona = await supabase
     .from('persona')
     .select('*')
     .eq('id', personaId)
     .single();
   ```
   - Or if you stored data in the Users table, query the relevant columns.
   
2. Construct a prompt that includes the persona description:

   ```javascript
   async function respondAsPersona(userQuery, persona) {
     const messages = [
       {
         role: 'system',
         content: `
           You are the digital twin of ${persona.persona_name}.
           The following text describes how they speak and think:
           "${persona.persona_description}"
           Respond to the user’s message as they would.
         `
       },
       {
         role: 'user',
         content: userQuery
       }
     ];
     
     const response = await chatOpenAI.invoke(messages);
     return response.content;
   }
   ```

3. Return that message back to the requester.

---

## 6. Building the “Chat with AI Avatar” Endpoint

Create an endpoint that allows users to chat with someone’s AI persona. For instance:

```javascript
// server/routes/avatars.js
import express from 'express';
import { respondAsPersona } from '../services/personaService.js'; // your custom logic
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/avatars/:personaId/chat
 * Body: { userMessage: string }
 */
router.post('/:personaId/chat', authenticateJWT, async (req, res) => {
  try {
    const { personaId } = req.params;
    const { userMessage } = req.body;

    // 1. Fetch persona from DB
    const persona = await getPersona(personaId); // your function

    // 2. Generate AI response
    const aiResponse = await respondAsPersona(userMessage, persona);

    // 3. Return the response
    return res.json({ success: true, response: aiResponse });
  } catch (error) {
    console.error('Error chatting with AI avatar:', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
```

---

## 7. Adding Contextual Awareness (Optional)

If you want the AI avatar to reference the user’s prior messages, embed those messages in Pinecone (via your RAG approach). Then:

1. Perform a similarity search on the user’s message embeddings when the AI receives a new prompt.  
2. Provide the top relevant messages to the LLM as additional context.  
3. Instruct the AI to use that context, along with the persona style, to respond with the user’s voice and knowledge.

This approach is outlined in docs/rag-tasks.md. You can adapt the snippet:
```javascript
// 1. Query Pinecone for relevant user messages
const similarUserMessages = await pineconeIndex.query({
  vector: await embeddings.embedQuery(userQuery),
  topK: 5,
  includeMetadata: true,
  filter: { senderUsername: userBeingImitated } // or userId
});

// 2. Build final prompt with style + relevant user messages
const messages = [
  {
    role: 'system',
    content: `
      You are the digital twin of ${persona.persona_name}.
      Persona/style info: "${persona.persona_description}"
      The following are some of ${persona.persona_name}'s recent messages:
      ${similarUserMessages.matches.map(match => match.metadata.content).join('\n')}
    `
  },
  {
    role: 'user',
    content: userQuery
  }
];
```

---

## 8. Persona Customization & UI

On your UI, you could:

1. Provide a button on the user’s profile: “Create/Update AI Persona.”  
2. When clicked, the frontend calls an endpoint that:  
   - Fetches the user’s messages.  
   - Summarizes them.  
   - Updates the persona table.  
   - Optionally upserts the embedding to Pinecone.  
3. Provide a “Chat with AI Persona” button on the user’s profile for other users.  
4. That button opens a chat interface that sends requests to /api/avatars/:personaId/chat.

---

## 9. Finalizing the Flow

1. User configures/updates their persona.  
2. Persona data is stored in the DB.  
3. Persona embedding is stored in Pinecone (optional).  
4. Another user visits the profile or direct link to chat with the AI persona.  
5. The backend fetches the persona data, constructs the prompt, and returns the AI’s response.  
6. If you want historical context, do a Pinecone similarity search on the user’s message embeddings as described in docs/rag-tasks.md.  

---

## 10. Testing and Edge Cases

1. Test creating/deleting persona records in the DB.  
2. Mock or use real chat histories to confirm the style summary is meaningful.  
3. Confirm that unauthorized users cannot update another user’s persona.  
4. Verify the AI responds within reasonable time and that Pinecone queries are working.  
5. If you plan to store multiple personas, ensure your endpoints accept personaId, not just userId.  

---

## Recap

Following these steps—adding a new (or updated) table for persona data, summarizing a user’s style from their chat history, embedding that summary, and exposing an endpoint to “talk” to that avatar—will allow you to implement a fully functioning AI digital twin. Refer to the checklists in docs/message-analysis-tasks.md and docs/rag-tasks.md to ensure best practices for embedding, searching, and generating responses with LangChain and Pinecone.

**Happy Building!**
```
