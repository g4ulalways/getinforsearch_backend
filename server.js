// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Define the proxy endpoint
app.post('/api/gemini', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not found.' });
    }

    // FINAL UPDATE: Using the correct model name from your list
    const modelName = 'gemini-1.5-flash'; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        const response = await axios.post(apiUrl, {
            contents: [{ parts: [{ text: prompt }] }],
        }, {
            headers: { 'Content-Type': 'application/json' },
        });
        res.json(response.data);
    } catch (error) {
        const errorMessage = error.response ? error.response.data.error : { message: error.message };
        console.error('Error calling Gemini API:', errorMessage);
        res.status(500).json({ error: 'Failed to fetch response from Gemini API.', details: errorMessage });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});