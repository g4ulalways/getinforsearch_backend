// server.js
const express = require('express')
const axios = require('axios')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Collect API keys for failover
const apiKeys = [
  process.env.PERPLEXITY_API_KEY_1,
  process.env.PERPLEXITY_API_KEY_2,
].filter(Boolean)

// CORS configuration to allow requests from your Hostinger frontend
app.use(cors({
  origin: [
    'https://getinforsearch.com',
    'https://www.getinforsearch.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    time: new Date().toISOString(),
    models: {
      online: 'sonar-pro',
      offline: 'sonar-reasoning'
    }
  })
})

// Helper: call Perplexity with failover across keys
async function callPerplexity(prompt, useOnline = true) {
  const url = 'https://api.perplexity.ai/chat/completions'
  
  // FIXED: Using current, valid Perplexity model names (August 2025)
  const model = useOnline
    ? 'sonar-pro'        // For web-connected searches (NEW)
    : 'sonar-reasoning'  // For general instruction-based tasks (NEW)

  if (apiKeys.length === 0) {
    throw new Error('No API keys configured')
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i]
    console.log(`[SERVER] Attempting request with API Key #${i+1} using model: ${model}`)

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
      )
      console.log(`[SERVER] Success with API Key #${i+1}`)
      return resp.data
    } catch (err) {
      const status = err.response ? err.response.status : 500
      const details = err.response ? err.response.data : { message: err.message }
      
      if (status === 429) {
        console.warn(`[SERVER] API Key #${i+1} rate-limited/exhausted. Trying next key...`)
        continue
      }
      
      console.error(`[SERVER] Error with API Key #${i+1}:`, JSON.stringify(details))
      
      // If this is the last key, throw the error
      if (i === apiKeys.length - 1) {
        throw err
      }
    }
  }
  
  throw new Error('All available API keys are exhausted or failed.')
}

// API route
app.post('/api/search', async (req, res) => {
  const { prompt, online = true } = req.body || {}
  console.log(`[SERVER] Received search request for prompt: "${prompt}" (online: ${online})`)

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt.' })
  }
  
  if (apiKeys.length === 0) {
    console.error('[SERVER] No Perplexity API keys found in .env file.')
    return res.status(500).json({ error: 'No API keys configured.' })
  }

  try {
    const data = await callPerplexity(prompt, online)
    return res.json(data)
  } catch (error) {
    const statusCode = error.response ? error.response.status : 502
    const errorMessage = error.response ? error.response.data : { message: error.message }
    console.error('[SERVER] Final Error Details:', JSON.stringify(errorMessage, null, 2))
    return res
      .status(statusCode)
      .json({ error: 'Failed to fetch from Perplexity API.', details: errorMessage })
  }
})

// Simple 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err)
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Health check available at: http://localhost:${PORT}/health`)
})
