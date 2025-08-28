// FIXED-server.js - Corrected Perplexity model names for 2025
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

console.log('🚀 GetInForSearch backend starting...');
console.log('📡 API Keys configured:', apiKeys.length);

// Helper: call Perplexity with correct model names (2025)
async function callPerplexity(prompt, useOnline = true) {
  const url = 'https://api.perplexity.ai/chat/completions';
  
  // ✅ UPDATED: Using current valid Perplexity model names (2025)
  const model = useOnline 
    ? 'sonar'           // ✅ Current online search model
    : 'r1-1776';        // ✅ Current offline chat model

  console.log(`🤖 Using model: ${model} (online: ${useOnline})`);
  
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    console.log(`[SERVER] Attempting request with API Key #${i+1}`);
    
    try {
      const requestData = {
        model,
        messages: [
          { role: 'system', content: 'Be precise and concise.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.2
      };

      console.log('📤 Request payload:', JSON.stringify(requestData, null, 2));
      
      const resp = await axios.post(url, requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      console.log(`✅ [SERVER] Success with API Key #${i+1}`);
      console.log(`📦 Response structure:`, Object.keys(resp.data));
      return resp.data;

    } catch (err) {
      const status = err.response ? err.response.status : 500;
      const details = err.response ? err.response.data : { message: err.message };
      
      console.error(`❌ [SERVER] Error with API Key #${i+1}:`, {
        status,
        details: JSON.stringify(details, null, 2)
      });
      
      if (status === 429) {
        console.warn(`[SERVER] API Key #${i+1} rate-limited. Trying next key...`);
        continue;
      }
      
      // If it's not a rate limit, log the error but continue to next key
      console.error(`[SERVER] Non-rate-limit error with API Key #${i+1}, continuing...`);
    }
  }

  throw new Error('All available API keys failed or are exhausted.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0-fixed-models',
    availableKeys: apiKeys.length,
    models: {
      online: 'sonar',
      offline: 'r1-1776'
    }
  });
});

// API route - handles both old and new request formats
app.post('/api/search', async (req, res) => {
  const { prompt, online = true } = req.body || {};
  
  console.log(`[SERVER] Received search request for prompt: "${prompt}"`);
  console.log(`[SERVER] Request body:`, JSON.stringify(req.body, null, 2));
  
  if (!prompt || typeof prompt !== 'string') {
    console.error('[SERVER] Invalid prompt:', prompt);
    return res.status(400).json({ error: 'Invalid prompt. Must be a non-empty string.' });
  }

  if (apiKeys.length === 0) {
    console.error('[SERVER] No Perplexity API keys found in environment variables.');
    return res.status(500).json({ error: 'No API keys configured.' });
  }

  try {
    console.log(`[SERVER] Calling Perplexity API (online: ${online})...`);
    const data = await callPerplexity(prompt, online);
    
    console.log(`✅ [SERVER] Successfully processed search request`);
    return res.json(data);

  } catch (error) {
    const statusCode = error.response ? error.response.status : 502;
    const errorMessage = error.response ? error.response.data : { message: error.message };
    
    console.error('[SERVER] Final Error Details:', JSON.stringify(errorMessage, null, 2));
    
    return res
      .status(statusCode)
      .json({ 
        error: 'Failed to fetch from Perplexity API.', 
        details: errorMessage,
        hint: 'Check API keys and model availability'
      });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GetInForSearch Backend API',
    version: '1.1.0-fixed-models',
    status: 'running',
    endpoints: {
      health: '/api/health',
      search: '/api/search'
    },
    models: {
      online: 'sonar (128k context)',
      offline: 'r1-1776 (128k context)'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search`);
  console.log(`📋 Available API keys: ${apiKeys.length}`);
});

module.exports = app;
