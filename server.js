// COMPLETELY-FIXED-server.js - Proper routing and error handling
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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('🚀 GetInForSearch backend starting...');
console.log('📡 API Keys configured:', apiKeys.length);
console.log('🌐 CORS enabled for all origins');

// Helper: call Perplexity with current valid models
async function callPerplexity(prompt, useOnline = true) {
  const url = 'https://api.perplexity.ai/chat/completions';
  
  // ✅ Using current valid Perplexity model names (August 2025)
  const model = useOnline 
    ? 'llama-3.1-sonar-large-128k-online'    // ✅ Current valid online model
    : 'llama-3.1-8b-instruct';               // ✅ Current valid offline model

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
        temperature: 0.2,
        stream: false
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
      
      // Continue to next key for other errors too
      console.error(`[SERVER] Error with API Key #${i+1}, trying next...`);
    }
  }

  throw new Error('All available API keys failed or are exhausted.');
}

// ✅ FIXED: Root endpoint
app.get('/', (req, res) => {
  console.log('📍 Root endpoint accessed');
  res.json({
    message: 'GetInForSearch Backend API',
    version: '1.2.0-completely-fixed',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      search: '/api/search (POST)',
      'search-head': '/api/search (HEAD)'
    },
    models: {
      online: 'llama-3.1-sonar-large-128k-online',
      offline: 'llama-3.1-8b-instruct'
    }
  });
});

// ✅ FIXED: Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check accessed');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.2.0-completely-fixed',
    availableKeys: apiKeys.length,
    models: {
      online: 'llama-3.1-sonar-large-128k-online',
      offline: 'llama-3.1-8b-instruct'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ✅ FIXED: Handle HEAD request to search endpoint
app.head('/api/search', (req, res) => {
  console.log('👤 HEAD request to /api/search');
  res.status(200).end();
});

// ✅ FIXED: Main search endpoint with better error handling
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  console.log(`🔍 [SERVER] Search request received at ${new Date().toISOString()}`);
  console.log(`📝 [SERVER] Request body:`, JSON.stringify(req.body, null, 2));
  console.log(`📋 [SERVER] Request headers:`, req.headers);
  
  const { prompt, online = true } = req.body || {};
  
  // Enhanced validation
  if (!prompt) {
    console.error('❌ [SERVER] Missing prompt in request body');
    return res.status(400).json({ 
      error: 'Missing prompt',
      details: 'Request body must include a "prompt" field',
      received: req.body
    });
  }
  
  if (typeof prompt !== 'string') {
    console.error('❌ [SERVER] Invalid prompt type:', typeof prompt);
    return res.status(400).json({ 
      error: 'Invalid prompt type',
      details: 'Prompt must be a string',
      received: { prompt, type: typeof prompt }
    });
  }
  
  if (prompt.trim().length === 0) {
    console.error('❌ [SERVER] Empty prompt');
    return res.status(400).json({ 
      error: 'Empty prompt',
      details: 'Prompt cannot be empty or only whitespace'
    });
  }

  if (apiKeys.length === 0) {
    console.error('❌ [SERVER] No API keys configured');
    return res.status(500).json({ 
      error: 'No API keys configured',
      details: 'Server is missing Perplexity API keys'
    });
  }

  try {
    console.log(`🚀 [SERVER] Processing search: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    const data = await callPerplexity(prompt, online);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ [SERVER] Search completed successfully in ${responseTime}ms`);
    
    // Add response metadata
    const responseWithMeta = {
      ...data,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        model: online ? 'llama-3.1-sonar-large-128k-online' : 'llama-3.1-8b-instruct',
        online
      }
    };
    
    return res.json(responseWithMeta);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ [SERVER] Search failed after ${responseTime}ms:`, error.message);
    
    const statusCode = error.response ? error.response.status : 502;
    const errorDetails = error.response ? error.response.data : { message: error.message };
    
    return res.status(statusCode).json({ 
      error: 'Search failed',
      details: errorDetails,
      responseTime,
      timestamp: new Date().toISOString(),
      hint: 'Check API keys and Perplexity service status'
    });
  }
});

// ✅ FIXED: Handle OPTIONS preflight requests
app.options('*', (req, res) => {
  console.log('⚙️ OPTIONS request:', req.path);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization');
  res.status(200).end();
});

// ✅ FIXED: Catch-all route for debugging
app.all('*', (req, res) => {
  console.log(`❓ [SERVER] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'GET /',
      'GET /api/health', 
      'POST /api/search',
      'HEAD /api/search'
    ]
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search`);
  console.log(`📋 Available API keys: ${apiKeys.length}`);
  console.log(`🕐 Server started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
