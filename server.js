// BULLETPROOF-server.js - Hardcore debugging and bulletproof API handling
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

console.log('🔥 BULLETPROOF GetInForSearch backend starting...');
console.log('📡 API Keys configured:', apiKeys.length);
console.log('🔑 API Key previews:', apiKeys.map(key => key ? `${key.substring(0, 8)}...` : 'null'));

// HARDCORE: Test all possible Perplexity models
const PERPLEXITY_MODELS = [
  'llama-3.1-sonar-small-128k-online',
  'llama-3.1-sonar-large-128k-online', 
  'llama-3.1-sonar-huge-128k-online',
  'sonar-small-online',
  'sonar-medium-online', 
  'sonar-large-online',
  'sonar',
  'llama-3.1-8b-instruct',
  'llama-3.1-70b-instruct',
  'llama-3-8b-instruct',
  'llama-3-70b-instruct'
];

// HARDCORE: Test single API key with specific model
async function testSingleAPIKey(apiKey, model, prompt = 'Hello') {
  const url = 'https://api.perplexity.ai/chat/completions';
  
  console.log(`🧪 Testing API Key ${apiKey.substring(0, 8)}... with model ${model}`);
  
  try {
    const requestData = {
      model,
      messages: [
        { role: 'system', content: 'Be precise and concise.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.2,
      stream: false
    };

    console.log('📤 Test request payload:', JSON.stringify(requestData, null, 2));
    
    const resp = await axios.post(url, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    console.log(`✅ SUCCESS: Key ${apiKey.substring(0, 8)}... with model ${model}`);
    return { success: true, data: resp.data, model, keyPreview: `${apiKey.substring(0, 8)}...` };

  } catch (err) {
    const status = err.response ? err.response.status : 500;
    const details = err.response ? err.response.data : { message: err.message };
    
    console.error(`❌ FAILED: Key ${apiKey.substring(0, 8)}... with model ${model}:`, {
      status,
      details: JSON.stringify(details, null, 2)
    });
    
    return { 
      success: false, 
      error: details, 
      status, 
      model, 
      keyPreview: `${apiKey.substring(0, 8)}...` 
    };
  }
}

// HARDCORE: Find working API key and model combination
async function findWorkingConfiguration(prompt = 'Hello') {
  console.log('🔍 HARDCORE: Finding working API key + model combination...');
  
  for (const apiKey of apiKeys) {
    console.log(`🔑 Testing API Key: ${apiKey.substring(0, 8)}...`);
    
    for (const model of PERPLEXITY_MODELS) {
      const result = await testSingleAPIKey(apiKey, model, prompt);
      
      if (result.success) {
        console.log(`🎯 FOUND WORKING COMBO: ${result.keyPreview} + ${result.model}`);
        return result;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('💥 NO WORKING COMBINATIONS FOUND');
  return null;
}

// BULLETPROOF: Call Perplexity with automatic model/key detection
async function callPerplexityBulletproof(prompt, useOnline = true) {
  console.log('🛡️ BULLETPROOF: Starting Perplexity call...');
  console.log('📝 Prompt:', prompt);
  console.log('🌐 Online mode:', useOnline);
  
  // Try to find working configuration
  const workingConfig = await findWorkingConfiguration(prompt);
  
  if (!workingConfig) {
    throw new Error('No working API key + model combination found');
  }
  
  console.log('✅ Using working configuration:', workingConfig);
  return workingConfig.data;
}

// Root endpoint
app.get('/', (req, res) => {
  console.log('📍 Root endpoint accessed');
  res.json({
    message: 'BULLETPROOF GetInForSearch Backend API',
    version: '2.0.0-bulletproof',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      search: '/api/search (POST)',
      'debug-search': '/api/debug-search (POST)',
      'env-check': '/api/env-check (POST)', 
      'key-test': '/api/key-test (POST)'
    },
    apiKeys: apiKeys.length,
    availableModels: PERPLEXITY_MODELS.length
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check accessed');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-bulletproof',
    availableKeys: apiKeys.length,
    keyPreviews: apiKeys.map(key => `${key.substring(0, 8)}...`),
    availableModels: PERPLEXITY_MODELS,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// HARDCORE: Environment variable check endpoint
app.post('/api/env-check', (req, res) => {
  console.log('🔧 Environment check requested');
  
  res.json({
    apiKeysConfigured: apiKeys.length,
    keyPreviews: apiKeys.map(key => key ? `${key.substring(0, 12)}...` : 'null'),
    environmentVariables: {
      PERPLEXITY_API_KEY_1: process.env.PERPLEXITY_API_KEY_1 ? `${process.env.PERPLEXITY_API_KEY_1.substring(0, 12)}...` : 'NOT SET',
      PERPLEXITY_API_KEY_2: process.env.PERPLEXITY_API_KEY_2 ? `${process.env.PERPLEXITY_API_KEY_2.substring(0, 12)}...` : 'NOT SET'
    },
    timestamp: new Date().toISOString()
  });
});

// HARDCORE: Manual API key test endpoint
app.post('/api/key-test', async (req, res) => {
  console.log('🔑 Manual API key test requested');
  
  if (apiKeys.length === 0) {
    return res.json({
      success: false,
      error: 'No API keys configured',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const workingConfig = await findWorkingConfiguration('test');
    
    res.json({
      success: !!workingConfig,
      workingConfig,
      totalKeystested: apiKeys.length,
      totalModelsPerKey: PERPLEXITY_MODELS.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// HARDCORE: Debug search endpoint with specific model testing
app.post('/api/debug-search', async (req, res) => {
  console.log('🔬 Debug search requested');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  
  const { prompt, model, debug } = req.body;
  
  if (!prompt) {
    return res.status(400).json({
      error: 'Missing prompt',
      timestamp: new Date().toISOString()
    });
  }
  
  if (apiKeys.length === 0) {
    return res.status(500).json({
      error: 'No API keys configured',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    let result;
    
    if (model) {
      // Test specific model with all keys
      console.log(`🎯 Testing specific model: ${model}`);
      
      for (const apiKey of apiKeys) {
        const testResult = await testSingleAPIKey(apiKey, model, prompt);
        if (testResult.success) {
          result = testResult;
          break;
        }
      }
    } else {
      // Find any working combination
      result = await findWorkingConfiguration(prompt);
    }
    
    if (result && result.success) {
      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(502).json({
        success: false,
        error: 'No working API key + model combination found',
        testedKeys: apiKeys.length,
        testedModels: model ? 1 : PERPLEXITY_MODELS.length,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Debug search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Handle HEAD request to search endpoint
app.head('/api/search', (req, res) => {
  console.log('👤 HEAD request to /api/search');
  res.status(200).end();
});

// BULLETPROOF: Main search endpoint
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  console.log(`🔍 [BULLETPROOF] Search request received at ${new Date().toISOString()}`);
  console.log(`📝 [BULLETPROOF] Request body:`, JSON.stringify(req.body, null, 2));
  
  const { prompt, online = true } = req.body || {};
  
  // Enhanced validation
  if (!prompt) {
    console.error('❌ [BULLETPROOF] Missing prompt in request body');
    return res.status(400).json({ 
      error: 'Missing prompt',
      details: 'Request body must include a "prompt" field',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  if (typeof prompt !== 'string') {
    console.error('❌ [BULLETPROOF] Invalid prompt type:', typeof prompt);
    return res.status(400).json({ 
      error: 'Invalid prompt type',
      details: 'Prompt must be a string',
      received: { prompt, type: typeof prompt },
      timestamp: new Date().toISOString()
    });
  }
  
  if (prompt.trim().length === 0) {
    console.error('❌ [BULLETPROOF] Empty prompt');
    return res.status(400).json({ 
      error: 'Empty prompt',
      details: 'Prompt cannot be empty or only whitespace',
      timestamp: new Date().toISOString()
    });
  }

  if (apiKeys.length === 0) {
    console.error('❌ [BULLETPROOF] No API keys configured');
    return res.status(500).json({ 
      error: 'No API keys configured',
      details: 'Server is missing Perplexity API keys',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log(`🚀 [BULLETPROOF] Processing search: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    const data = await callPerplexityBulletproof(prompt, online);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ [BULLETPROOF] Search completed successfully in ${responseTime}ms`);
    
    // Add response metadata
    const responseWithMeta = {
      ...data,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        online,
        version: '2.0.0-bulletproof'
      }
    };
    
    return res.json(responseWithMeta);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ [BULLETPROOF] Search failed after ${responseTime}ms:`, error.message);
    
    return res.status(502).json({ 
      error: 'Search failed',
      details: error.message,
      responseTime,
      timestamp: new Date().toISOString(),
      hint: 'Check API keys and Perplexity service status',
      availableKeys: apiKeys.length,
      keyPreviews: apiKeys.map(key => `${key.substring(0, 8)}...`)
    });
  }
});

// Handle OPTIONS preflight requests
app.options('*', (req, res) => {
  console.log('⚙️ OPTIONS request:', req.path);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization');
  res.status(200).end();
});

// Catch-all route for debugging
app.all('*', (req, res) => {
  console.log(`❓ [BULLETPROOF] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'GET /',
      'GET /api/health', 
      'POST /api/search',
      'POST /api/debug-search',
      'POST /api/env-check',
      'POST /api/key-test',
      'HEAD /api/search'
    ],
    timestamp: new Date().toISOString()
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
  console.log(`✅ BULLETPROOF Server is running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search`);
  console.log(`🔬 Debug endpoint: http://localhost:${PORT}/api/debug-search`);
  console.log(`📋 Available API keys: ${apiKeys.length}`);
  console.log(`🤖 Available models: ${PERPLEXITY_MODELS.length}`);
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
