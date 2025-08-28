// optimized-server.js - Enhanced backend with performance optimizations

const express = require('express')
const axios = require('axios')
const cors = require('cors')
const path = require('path')
const NodeCache = require('node-cache')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Enhanced caching system
const cache = new NodeCache({
  stdTTL: 3600, // 1 hour default
  checkperiod: 120, // Check for expired keys every 2 minutes
  maxKeys: 1000 // Limit cache size
})

// Performance monitoring
const performanceMetrics = {
  totalRequests: 0,
  averageResponseTime: 0,
  slowQueries: [],
  cacheHitRate: 0,
  cacheHits: 0,
  cacheMisses: 0
}

// Collect API keys for failover
const apiKeys = [
  process.env.PERPLEXITY_API_KEY_1,
  process.env.PERPLEXITY_API_KEY_2,
].filter(Boolean)

// Middleware
app.use(cors())
app.use(express.json())

// Request logging and metrics
app.use((req, res, next) => {
  req.startTime = Date.now()
  performanceMetrics.totalRequests++
  next()
})

// Query Analysis Functions
function analyzeQueryComplexity(prompt) {
  const length = prompt.length
  const hasQuestions = /\?/.test(prompt)
  const hasMultipleTopics = prompt.split(/[,;]/).length > 1
  const hasTechnicalTerms = /\b(algorithm|quantum|molecular|statistical|mathematical|technical|complex|advanced|detailed|comprehensive|analysis|research|study|investigation)\b/i.test(prompt)
  const isCreativeTask = /\b(write|create|generate|story|poem|creative|imagine|design)\b/i.test(prompt)
  
  if (isCreativeTask) return 'creative'
  if (length < 20 && !hasQuestions && !hasTechnicalTerms) return 'simple'
  if (length > 100 || hasTechnicalTerms || hasMultipleTopics) return 'complex'
  return 'medium'
}

function getOptimalConfiguration(complexity, prompt) {
  const isNewsQuery = /\b(news|latest|recent|today|current|breaking)\b/i.test(prompt)
  
  switch (complexity) {
    case 'simple':
      return {
        model: 'llama-3.1-sonar-small-128k-online',
        maxTokens: 1000,
        temperature: 0.2,
        cacheTTL: 7200, // 2 hours for simple queries
        searchRecency: 'month'
      }
    case 'medium':
      return {
        model: 'llama-3.1-sonar-large-128k-online', 
        maxTokens: 2000,
        temperature: 0.3,
        cacheTTL: isNewsQuery ? 300 : 3600, // 5 min for news, 1 hour for others
        searchRecency: isNewsQuery ? 'day' : 'month'
      }
    case 'complex':
      return {
        model: 'llama-3.1-sonar-huge-128k-online',
        maxTokens: 4000,
        temperature: 0.4,
        cacheTTL: 1800, // 30 minutes
        searchRecency: 'week'
      }
    case 'creative':
      return {
        model: 'llama-3.1-70b-instruct',
        maxTokens: 3000,
        temperature: 0.7,
        cacheTTL: 3600,
        searchRecency: null // No web search for creative tasks
      }
    default:
      return {
        model: 'llama-3.1-sonar-large-128k-online',
        maxTokens: 2000,
        temperature: 0.3,
        cacheTTL: 3600,
        searchRecency: 'month'
      }
  }
}

// Enhanced cache key generation
function generateCacheKey(prompt, config) {
  const normalizedPrompt = prompt.toLowerCase().trim().replace(/\s+/g, ' ')
  return `query:${normalizedPrompt}:${config.model}:${config.searchRecency}`
}

// Enhanced Perplexity API call with optimization
async function callPerplexity(prompt, config, useStreaming = false) {
  const url = 'https://api.perplexity.ai/chat/completions'
  
  const payload = {
    model: config.model,
    messages: [
      { 
        role: 'system', 
        content: 'Provide accurate, concise, and well-structured answers. Use clear formatting and focus on the most relevant information.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    stream: useStreaming
  }

  // Add search recency for online models
  if (config.searchRecency && config.model.includes('online')) {
    payload.search_recency_filter = config.searchRecency
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i]
    console.log(`[SERVER] Attempting request with API Key #${i+1}, Model: ${config.model}`)

    try {
      const resp = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': useStreaming ? 'text/event-stream' : 'application/json',
        },
        timeout: 30000,
        responseType: useStreaming ? 'stream' : 'json'
      })

      console.log(`[SERVER] Success with API Key #${i+1}`)
      return resp
    } catch (err) {
      const status = err.response ? err.response.status : 500
      const details = err.response ? err.response.data : { message: err.message }
      
      if (status === 429) {
        console.warn(`[SERVER] API Key #${i+1} rate-limited. Trying next key...`)
        continue
      }
      
      console.error(`[SERVER] Error with API Key #${i+1}:`, JSON.stringify(details))
      
      if (i === apiKeys.length - 1) {
        throw err
      }
    }
  }
  
  throw new Error('All available API keys are exhausted or failed.')
}

// Regular API endpoint
app.post('/api/search', async (req, res) => {
  const startTime = Date.now()
  const { prompt, online = true } = req.body || {}
  
  console.log(`[SERVER] Received search request: "${prompt}"`)
  
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt.' })
  }
  
  if (apiKeys.length === 0) {
    console.error('[SERVER] No Perplexity API keys found.')
    return res.status(500).json({ error: 'No API keys configured.' })
  }

  try {
    // Analyze query and get optimal configuration
    const complexity = analyzeQueryComplexity(prompt)
    const config = getOptimalConfiguration(complexity, prompt)
    const cacheKey = generateCacheKey(prompt, config)
    
    console.log(`[SERVER] Query complexity: ${complexity}, Model: ${config.model}`)
    
    // Check cache first
    const cachedResult = cache.get(cacheKey)
    if (cachedResult) {
      console.log('[SERVER] Cache hit!')
      performanceMetrics.cacheHits++
      
      const responseTime = Date.now() - startTime
      performanceMetrics.averageResponseTime = 
        (performanceMetrics.averageResponseTime + responseTime) / 2
      
      return res.json(cachedResult)
    }
    
    performanceMetrics.cacheMisses++
    
    // Make API call
    const response = await callPerplexity(prompt, config)
    const data = response.data
    
    // Cache the result
    cache.set(cacheKey, data, config.cacheTTL)
    
    // Update performance metrics
    const responseTime = Date.now() - startTime
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime + responseTime) / 2
    
    if (responseTime > 3000) {
      performanceMetrics.slowQueries.push({
        prompt: prompt.substring(0, 100),
        responseTime,
        complexity,
        timestamp: new Date().toISOString()
      })
    }
    
    console.log(`[SERVER] Request completed in ${responseTime}ms`)
    return res.json(data)
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    const statusCode = error.response ? error.response.status : 502
    const errorMessage = error.response ? error.response.data : { message: error.message }
    
    console.error('[SERVER] Error:', JSON.stringify(errorMessage, null, 2))
    console.log(`[SERVER] Failed request took ${responseTime}ms`)
    
    return res.status(statusCode).json({ 
      error: 'Failed to fetch from Perplexity API.', 
      details: errorMessage,
      responseTime
    })
  }
})

// Streaming endpoint for real-time responses
app.post('/api/search/stream', async (req, res) => {
  const startTime = Date.now()
  const { prompt, online = true } = req.body || {}
  
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt.' })
  }
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  })
  
  try {
    const complexity = analyzeQueryComplexity(prompt)
    const config = getOptimalConfiguration(complexity, prompt)
    const cacheKey = generateCacheKey(prompt, config)
    
    // Check cache first
    const cachedResult = cache.get(cacheKey)
    if (cachedResult) {
      res.write(`data: ${JSON.stringify(cachedResult)}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    
    // Stream from Perplexity
    const response = await callPerplexity(prompt, config, true)
    
    let fullResponse = ''
    response.data.on('data', chunk => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            // Cache the complete response
            if (fullResponse) {
              cache.set(cacheKey, { 
                choices: [{ message: { content: fullResponse } }] 
              }, config.cacheTTL)
            }
            res.write('data: [DONE]\n\n')
            res.end()
            return
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.choices?.[0]?.delta?.content) {
              fullResponse += parsed.choices[0].delta.content
            }
            res.write(`data: ${data}\n\n`)
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      }
    })
    
    response.data.on('error', err => {
      console.error('[SERVER] Streaming error:', err)
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
      res.end()
    })
    
  } catch (error) {
    console.error('[SERVER] Streaming setup error:', error)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const cacheStats = cache.getStats()
  performanceMetrics.cacheHitRate = 
    (performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100
  
  res.json({
    ...performanceMetrics,
    cacheStats,
    uptime: process.uptime()
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-optimized'
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Optimized server running on port ${PORT}`)
  console.log(`📊 Performance monitoring enabled`)
  console.log(`⚡ Caching enabled with ${cache.options.maxKeys} max keys`)
})
