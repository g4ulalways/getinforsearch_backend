// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/search', async (req, res) => {
  const { prompt } = req.body || {};
  console.log(`[SERVER] Received search request for prompt: "${prompt}"`);

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('[SERVER] Perplexity API key not found in env.');
    return res.status(500).json({ error: 'API key not configured on the server.' });
  } // <-- close the if-block properly

  const perplexityApiUrl = 'https://api.perplexity.ai/chat/completions';

  try {
    console.log('[SERVER] Sending request to Perplexity API...');
    const response = await axios.post(
      perplexityApiUrl,
      {
        // Use a currently permitted model
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'Be precise and concise.' },
          { role: 'user', content: prompt || 'hello' },
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

    console.log('[SERVER] Successfully received response from Perplexity.');
    return res.json(response.data);
  } catch (error) {
    const statusCode = error.response ? error.response.status : 500;
    const errorMessage = error.response ? error.response.data : { message: error.message };
    console.error('[SERVER] Error while calling Perplexity API.');
    console.error(`[SERVER] Status Code: ${statusCode}`);
    console.error('[SERVER] Error Details:', JSON.stringify(errorMessage, null, 2));
    return res.status(statusCode).json({
      error: 'Failed to fetch response from Perplexity API.',
      details: errorMessage,
    });
  }
});

// Health check to verify key + model quickly
app.get('/api/ping-perplexity', async (req, res) => {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key missing' });
  try {
    const r = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      { model: 'sonar', messages: [{ role: 'user', content: 'ping' }] },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', accept: 'application/json' } }
    );
    return res.status(r.status).json({ ok: true, status: r.status, id: r.data?.id || null });
  } catch (e) {
    return res.status(e.response?.status || 500).json({ ok: false, status: e.response?.status || 500, data: e.response?.data || e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running. Open http://localhost:${PORT} in your browser.`);
});
