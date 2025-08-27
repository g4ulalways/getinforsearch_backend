// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Load all available API keys into an array ---
const apiKeys = [
    process.env.PERPLEXITY_API_KEY_1,
    process.env.PERPLEXITY_API_KEY_2
    // You can add more keys here, like process.env.PERPLEXITY_API_KEY_3
].filter(key => key); // This filters out any keys that are not set

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Function to try making the API call with failover ---
async function makeApiCallWithFailover(prompt) {
    // Loop through each key until one succeeds
    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        console.log(`[SERVER] Attempting request with API Key #${i + 1}`);
        
        try {
            const perplexityApiUrl = 'https://api.perplexity.ai/chat/completions';
            const response = await axios.post(perplexityApiUrl, {
                // --- FINAL FIX: Using a powerful and stable model ---
                model: 'llama-3-70b-instruct',
                messages: [
                    { role: 'system', content: 'Be precise and concise.' },
                    { role: 'user', content: prompt },
                ],
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
            });

            // If the request is successful, return the data
            console.log(`[SERVER] Success with API Key #${i + 1}`);
            return response.data;

        } catch (error) {
            const statusCode = error.response ? error.response.status : 500;
            // A 429 status code means "Too Many Requests," which often indicates an exhausted key.
            if (statusCode === 429) {
                console.warn(`[SERVER] API Key #${i + 1} is exhausted or rate-limited. Trying next key...`);
                continue; // Move to the next key
            } else {
                // For any other error, we should stop and report it.
                console.error(`[SERVER] A critical error occurred with API Key #${i + 1}.`);
                throw error; // Re-throw the error to be caught by the main handler
            }
        }
    }

    // If the loop finishes without a successful request, all keys have failed.
    throw new Error('All available API keys are exhausted or rate-limited.');
}


// Define the proxy endpoint for your API
app.post('/api/search', async (req, res) => {
    const { prompt } = req.body;
    console.log(`[SERVER] Received search request for prompt: "${prompt}"`);

    if (apiKeys.length === 0) {
        console.error('[SERVER] No Perplexity API keys found in .env file.');
        return res.status(500).json({ error: 'No API keys configured on the server.' });
    }

    try {
        const data = await makeApiCallWithFailover(prompt);
        res.json(data);
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const errorMessage = error.response ? error.response.data : { message: error.message };
        console.error(`[SERVER] Failed to get response after trying all keys.`);
        console.error('[SERVER] Final Error Details:', JSON.stringify(errorMessage, null, 2));

        res.status(statusCode).json({ error: 'Failed to fetch response from Perplexity API.', details: errorMessage });
    }
});

// Fallback route for single-page applications
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running. Open http://localhost:${PORT} in your browser.`);
});
