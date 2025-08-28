// FINAL-BULLETPROOF-server.js - Uses ACTUAL current Perplexity model names
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

console.log('🔥 FINAL BULLETPROOF GetInForSearch backend starting...');
console.log('📡 API Keys configured:', apiKeys.length);

// ✅ FINAL: ACTUAL current valid Perplexity model names (August 2025)
const CURRENT_PERPLEXITY_MODELS = [
  // PRIMARY MODELS (Most likely to work)
  'sonar',                    // ✅ Lightweight, cost-effective search model
  'sonar-pro',               // ✅ Advanced search with complex queries
  'sonar-reasoning',         // ✅ Chain-of-thought reasoning model
  
  // ALTERNATIVE MODELS
  'sonar-reasoning-pro',     // ✅ Advanced reasoning model
  'sonar-deep-research',     // ✅ Deep research model
  
  // FALLBACK MODELS (if search models fail)
  'r1-1776',                 // ✅ DeepSeek R1 based model
  'llama-3.1-70b-instruct',  // ✅ Instruct model fallback
  'llama-3.1-8b-instruct'    // ✅ Smaller instruct model
];

console.log('🤖 Available models:', CURRENT_PERPLEXITY_MODELS);

// BULLETPROOF: Test single API key with specific model
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

    console.log(`✅ SUCCESS: Key ${apiKey.substring(0, 8)}... with model ${model}`);
    console.log(`📦 Response preview:`, resp.data.choices?.[0]?.message?.content?.substring(0, 100) + '...');
    
    return { 
      success: true, 
      data: resp.data, 
      model, 
      keyPreview: `${apiKey.substring(0, 8)}...`,
      responseLength: resp.data.choices?.[0]?.message?.content?.length || 0
    };

  } catch (err) {
    const status = err.response ? err.response.status : 500;
    const details = err.response ? err.response.data : { message: err.message };
    
    console.error(`❌ FAILED: Key ${apiKey.substring(0, 8)}... with model ${model}:`, {
      status,
      error: details?.error || details?.message || 'Unknown error'
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

// BULLETPROOF: Find working API key and model combination
async function findWorkingConfiguration(prompt) {
  console.log('🔍 BULLETPROOF: Finding working API key + model combination...');
  console.log(`📝 Prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
  
  for (const apiKey of apiKeys) {
    console.log(`🔑 Testing API Key: ${apiKey.substring(0, 8)}...`);
    
    for (const model of CURRENT_PERPLEXITY_MODELS) {
      const result = await testSingleAPIKey(apiKey, model, prompt);
      
      if (result.success) {
        console.log(`🎯 FOUND WORKING COMBO: ${result.keyPreview} + ${result.model}`);
        console.log(`📏 Response length: ${result.responseLength} characters`);
        return result;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('💥 NO WORKING COMBINATIONS FOUND');
  return null;
}

// BULLETPROOF: Call Perplexity with automatic detection
async function callPerplexityBulletproof(prompt, useOnline = true) {
  console.log('🛡️ BULLETPROOF: Starting Perplexity call...');
  console.log('📝 Full prompt:', prompt);
  console.log('🌐 Online mode:', useOnline);
  
  // Find working configuration
  const workingConfig = await findWorkingConfiguration(prompt);
  
  if (!workingConfig) {
    throw new Error('No working API key + model combination found. All models failed.');
  }
  
  console.log('✅ Using working configuration:', {
    model: workingConfig.model,
    keyPreview: workingConfig.keyPreview,
    responseLength: workingConfig.responseLength
  });
  
  return workingConfig.data;
}

// Root endpoint
app.get('/', (req, res) => {
  console.log('📍 Root endpoint accessed');
  res.json({
    message: 'FINAL BULLETPROOF GetInForSearch Backend API',
    version: '3.0.0-final-bulletproof',
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
    availableModels: CURRENT_PERPLEXITY_MODELS
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check accessed');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0-final-bulletproof',
    availableKeys: apiKeys.length,
    keyPreviews: apiKeys.map(key => `${key.substring(0, 8)}...`),
    currentModels: CURRENT_PERPLEXITY_MODELS,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Environment variable check endpoint
app.post('/api/env-check', (req, res) => {
  console.log('🔧 Environment check requested');
  
  res.json({
    apiKeysConfigured: apiKeys.length,
    keyPreviews: apiKeys.map(key => key ? `${key.substring(0, 12)}...` : 'null'),
    environmentVariables: {
      PERPLEXITY_API_KEY_1: process.env.PERPLEXITY_API_KEY_1 ? `${process.env.PERPLEXITY_API_KEY_1.substring(0, 12)}...` : 'NOT SET',
      PERPLEXITY_API_KEY_2: process.env.PERPLEXITY_API_KEY_2 ? `${process.env.PERPLEXITY_API_KEY_2.substring(0, 12)}...` : 'NOT SET'
    },
    currentModels: CURRENT_PERPLEXITY_MODELS,
    timestamp: new Date().toISOString()
  });
});

// Manual API key test endpoint
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
    const workingConfig = await findWorkingConfiguration('test query');
    
    res.json({
      success: !!workingConfig,
      workingConfig,
      totalKeystested: apiKeys.length,
      totalModelsPerKey: CURRENT_PERPLEXITY_MODELS.length,
      modelsUsed: CURRENT_PERPLEXITY_MODELS,
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

// Debug search endpoint
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
        testedModels: model ? 1 : CURRENT_PERPLEXITY_MODELS.length,
        modelsUsed: CURRENT_PERPLEXITY_MODELS,
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

// FINAL BULLETPROOF: Main search endpoint
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  console.log(`🔍 [FINAL BULLETPROOF] Search request received at ${new Date().toISOString()}`);
  console.log(`📝 [FINAL BULLETPROOF] Request body:`, JSON.stringify(req.body, null, 2));
  
  const { prompt, online = true } = req.body || {};
  
  // Enhanced validation
  if (!prompt) {
    console.error('❌ [FINAL BULLETPROOF] Missing prompt in request body');
    return res.status(400).json({ 
      error: 'Missing prompt',
      details: 'Request body must include a "prompt" field',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  if (typeof prompt !== 'string') {
    console.error('❌ [FINAL BULLETPROOF] Invalid prompt type:', typeof prompt);
    return res.status(400).json({ 
      error: 'Invalid prompt type',
      details: 'Prompt must be a string',
      received: { prompt, type: typeof prompt },
      timestamp: new Date().toISOString()
    });
  }
  
  if (prompt.trim().length === 0) {
    console.error('❌ [FINAL BULLETPROOF] Empty prompt');
    return res.status(400).json({ 
      error: 'Empty prompt',
      details: 'Prompt cannot be empty or only whitespace',
      timestamp: new Date().toISOString()
    });
  }

  if (apiKeys.length === 0) {
    console.error('❌ [FINAL BULLETPROOF] No API keys configured');
    return res.status(500).json({ 
      error: 'No API keys configured',
      details: 'Server is missing Perplexity API keys',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log(`🚀 [FINAL BULLETPROOF] Processing search: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    const data = await callPerplexityBulletproof(prompt, online);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ [FINAL BULLETPROOF] Search completed successfully in ${responseTime}ms`);
    console.log(`📏 Response length: ${data.choices?.[0]?.message?.content?.length || 0} characters`);
    
    // Add response metadata
    const responseWithMeta = {
      ...data,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        online,
        version: '3.0.0-final-bulletproof',
        responseLength: data.choices?.[0]?.message?.content?.length || 0
      }
    };
    
    return res.json(responseWithMeta);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ [FINAL BULLETPROOF] Search failed after ${responseTime}ms:`, error.message);
    
    return res.status(502).json({ 
      error: 'Search failed',
      details: error.message,
      responseTime,
      timestamp: new Date().toISOString(),
      hint: 'All current Perplexity models failed. Check API keys or contact Perplexity support.',
      availableKeys: apiKeys.length,
      keyPreviews: apiKeys.map(key => `${key.substring(0, 8)}...`),
      modelsUsed: CURRENT_PERPLEXITY_MODELS
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
  console.log(`❓ [FINAL BULLETPROOF] Unhandled route: ${req.method} ${req.path}`);
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
  console.log(`✅ FINAL BULLETPROOF Server is running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search`);
  console.log(`🔬 Debug endpoint: http://localhost:${PORT}/api/debug-search`);
  console.log(`📋 Available API keys: ${apiKeys.length}`);
  console.log(`🤖 Current valid models: ${CURRENT_PERPLEXITY_MODELS.join(', ')}`);
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
