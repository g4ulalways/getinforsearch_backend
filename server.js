const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Collect API keys for failover
const apiKeys = [
  process.env.PERPLEXITY_API_KEY_1,
  process.env.PERPLEXITY_API_KEY_2,
].filter(Boolean);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: call Perplexity with failover across keys
async function callPerplexity(prompt, useOnline = true) {
  const url = 'https://api.perplexity.ai/chat/completions';
  
  // FIXED: Use NEW valid Perplexity model names (as of August 2025)
  const model = useOnline 
    ? 'sonar'        // NEW: Replaces llama-3.1-sonar-large-128k-online
    : 'sonar-pro';   // NEW: For more complex queries

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    console.log(`[SERVER] Attempting request with API Key #${i + 1}`);

    try {
      const resp = await axios.post(
        url,
        {
          model,
          messages: [
            { role: 'system', content: 'Be precise and concise.' },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log(`[SERVER] Success with API Key #${i + 1}`);
      return resp.data;
    } catch (err) {
      const status = err.response ? err.response.status : 500;
      const details = err.response ? err.response.data : { message: err.message };

      if (status === 429) {
        console.warn(`[SERVER] API Key #${i + 1} rate-limited/exhausted. Trying next key...`);
        continue;
      }

      console.error(`[SERVER] Error with API Key #${i + 1}:`, JSON.stringify(details));
      throw err;
    }
  }

  throw new Error('All available API keys are exhausted or failed.');
}

// API route
app.post('/api/search', async (req, res) => {
  const { prompt, online = true } = req.body || {};
  console.log(`[SERVER] Received search request for prompt: "${prompt}"`);

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt.' });
  }
  if (apiKeys.length === 0) {
    console.error('[SERVER] No Perplexity API keys found in .env file.');
    return res.status(500).json({ error: 'No API keys configured on the server.' });
  }

  try {
    const data = await callPerplexity(prompt, online);
    return res.json(data);
  } catch (error) {
    const statusCode = error.response ? error.response.status : 502;
    const errorMessage = error.response ? error.response.data : { message: error.message };
    console.error('[SERVER] Final Error Details:', JSON.stringify(errorMessage, null, 2));
    return res
      .status(statusCode)
      .json({ error: 'Failed to fetch response from Perplexity API.', details: errorMessage });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running. Open http://localhost:${PORT}`);
});
