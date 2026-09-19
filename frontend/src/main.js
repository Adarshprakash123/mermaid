import './style.css'
import mermaid from 'mermaid'
import pako from 'pako'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Arial, sans-serif',
})

// API base URL
const API_BASE = '/api'

// State management
let currentRepository = null
let currentFiles = []
let currentAnalysis = null
let currentMermaidCode = ''

// DOM elements
const app = document.getElementById('app')

// API functions
async function analyzeRepository(repoUrl) {
  try {
    console.log('📤 Sending repository analysis request to:', `${API_BASE}/analyze-repository`)
    console.log('📤 Request body:', { repo_url: repoUrl })
    
    const response = await fetch(`${API_BASE}/analyze-repository`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repo_url: repoUrl })
    })
    
    console.log('📥 Repository analysis response status:', response.status)
    console.log('📥 Repository analysis response headers:', response.headers)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Repository analysis error response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { detail: errorText }
      }
      throw new Error(errorData.detail || `HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ Repository analysis success:', result)
    return result
  } catch (error) {
    console.error('❌ Repository analysis error:', error)
    throw error
  }
}

async function generateDiagram(codeContext) {
  try {
    console.log('📤 Sending diagram request with context length:', codeContext.length)
    
    const response = await fetch(`${API_BASE}/generate-diagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code_context: codeContext })
    })
    
    console.log('📥 Diagram response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { detail: errorText }
      }
      throw new Error(errorData.detail || `HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ Diagram response:', result)
    return result
  } catch (error) {
    console.error('❌ Diagram generation error:', error)
    throw error
  }
}


// UI Components
function createHeader() {
  return `
    <header class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        Code-to-Mermaid Generator
      </h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Analyze any GitHub repository and automatically generate professional Mermaid diagrams 
        using AI-powered code analysis.
      </p>
    </header>
  `
}

function createRepositoryInput() {
  return `
    <div class="max-w-4xl mx-auto">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title flex items-center">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"></path>
            </svg>
            Analyze GitHub Repository
          </h2>
          <p class="text-gray-600 mt-2">
            Enter a GitHub repository URL to analyze its code structure and generate Mermaid diagrams
          </p>
        </div>

        <div class="p-6 space-y-6">
          <div>
            <label for="repoUrl" class="block text-sm font-medium text-gray-700 mb-2">
              Repository URL
            </label>
            <div class="flex space-x-4">
              <input
                id="repoUrl"
                type="url"
                placeholder="https://github.com/username/repository"
                class="form-input flex-1"
              />
              <button
                id="analyzeBtn"
                class="btn-primary flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <span>Analyze</span>
              </button>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-sm font-medium text-blue-800 mb-2">Try these example repositories:</h3>
            <div class="space-y-1">
              <button class="example-repo text-sm text-blue-600 hover:text-blue-800 block" data-url="https://github.com/facebook/react">
                • React - https://github.com/facebook/react
              </button>
              <button class="example-repo text-sm text-blue-600 hover:text-blue-800 block" data-url="https://github.com/tiangolo/fastapi">
                • FastAPI - https://github.com/tiangolo/fastapi
              </button>
              <button class="example-repo text-sm text-blue-600 hover:text-blue-800 block" data-url="https://github.com/expressjs/express">
                • Express.js - https://github.com/expressjs/express
              </button>
            </div>
          </div>

          <div id="errorMessage" class="hidden alert alert-error"></div>
          <div id="loadingMessage" class="hidden bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <div class="loading-spinner"></div>
              <span class="text-yellow-800 font-medium">Analyzing repository...</span>
            </div>
            <p class="text-yellow-700 text-sm mt-2">
              This may take a few moments depending on the repository size.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

function createResultsView() {
  if (!currentRepository) return ''

  return `
    <div class="max-w-6xl mx-auto space-y-8">
      <!-- Repository Info -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Repository Analysis Results</h2>
          <p class="text-gray-600 mt-2">
            Analysis complete for <strong>${currentRepository.full_name}</strong>
          </p>
        </div>
        <div class="p-6">
          <div class="stats">
            <div class="stat-item">
              <div class="stat-value">${currentAnalysis.total_files}</div>
              <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${currentAnalysis.total_lines.toLocaleString()}</div>
              <div class="stat-label">Total Lines</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${currentAnalysis.complexity_score}</div>
              <div class="stat-label">Complexity Score</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Languages</h3>
              <div class="flex flex-wrap gap-2">
                ${currentAnalysis.languages.map(lang => 
                  `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${lang}</span>`
                ).join('')}
              </div>
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">File Types</h3>
              <div class="flex flex-wrap gap-2">
                ${currentAnalysis.file_types.map(type => 
                  `<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">${type}</span>`
                ).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Generated Mermaid Diagram & Code -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Generated Mermaid Diagram & Code</h2>
        </div>
        <div class="p-6">
          <div id="mermaidContainer" class="mermaid-container">
            <div class="text-center text-gray-500 py-8">
              <div class="loading-spinner mx-auto mb-4"></div>
              <p>Generating Mermaid code...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Reset Button -->
      <div class="text-center">
        <button id="resetBtn" class="btn-secondary">
          Analyze New Repository
        </button>
      </div>
    </div>
  `
}

function renderApp() {
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <div class="container mx-auto px-4 py-8">
        ${createHeader()}
        <main>
          ${currentRepository ? createResultsView() : createRepositoryInput()}
        </main>
      </div>
    </div>
  `
  
  attachEventListeners()
}

function attachEventListeners() {
  // Analyze button
  const analyzeBtn = document.getElementById('analyzeBtn')
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', handleAnalyze)
  }

  // Example repository buttons
  document.querySelectorAll('.example-repo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.dataset.url
      document.getElementById('repoUrl').value = url
    })
  })

  // Reset button
  const resetBtn = document.getElementById('resetBtn')
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset)
  }

  // Note: Copy, Download, and Mermaid Live buttons are now handled inline in the success message
  // No need for separate event listeners as they use onclick handlers
}

async function handleAnalyze() {
  const repoUrl = document.getElementById('repoUrl').value.trim()
  
  if (!repoUrl) {
    showError('Please enter a GitHub repository URL')
    return
  }

  if (!repoUrl.includes('github.com')) {
    showError('Please enter a valid GitHub repository URL')
    return
  }

  showLoading(true)
  hideError()

  try {
    console.log('🔍 Starting repository analysis...')
    const result = await analyzeRepository(repoUrl)
    console.log('✅ Repository analysis completed:', result)
    
    currentRepository = result.repository
    currentFiles = result.files
    currentAnalysis = result.analysis
    
    // Render the results FIRST to ensure DOM elements exist
    renderApp()
    
    // Wait a tick for DOM to be ready, then generate diagram
    setTimeout(async () => {
      await generateAndRenderDiagram()
    }, 100)
  } catch (error) {
    console.error('❌ Repository analysis failed:', error)
    showError(error.message || 'Failed to analyze repository')
  } finally {
    showLoading(false)
  }
}

async function generateAndRenderDiagram() {
  try {
    // Ensure DOM elements exist before proceeding
    let container = document.getElementById('mermaidContainer')
    if (!container) {
      console.log('⚠️ Mermaid container not found, re-rendering app...')
      renderApp()
      container = document.getElementById('mermaidContainer')
      if (!container) {
        throw new Error('Unable to create mermaid container')
      }
    }

    // Build code context
    let codeContext = `Repository: ${currentRepository.full_name}\n`
    codeContext += `Description: ${currentRepository.description}\n`
    codeContext += `Language: ${currentRepository.language}\n\n`
    
    codeContext += `Code Analysis:\n`
    codeContext += `- Total Files: ${currentAnalysis.total_files}\n`
    codeContext += `- Total Lines: ${currentAnalysis.total_lines}\n`
    codeContext += `- File Types: ${currentAnalysis.file_types.join(', ')}\n`
    codeContext += `- Languages: ${currentAnalysis.languages.join(', ')}\n`
    codeContext += `- Classes: ${currentAnalysis.classes.join(', ')}\n`
    codeContext += `- Functions: ${currentAnalysis.functions.join(', ')}\n`
    codeContext += `- Dependencies: ${currentAnalysis.dependencies.join(', ')}\n`
    codeContext += `- Complexity Score: ${currentAnalysis.complexity_score}\n\n`

    // Add file contents
    codeContext += `Selected Files Content:\n`
    currentFiles.forEach(file => {
      if (file.content) {
        codeContext += `\n--- ${file.path} ---\n`
        codeContext += file.content.substring(0, 2000) // Limit content length
        codeContext += '\n'
      }
    })

    // Show loading state for code generation
    container.innerHTML = `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-blue-700 font-medium">Generating Mermaid code...</span>
        </div>
      </div>
    `

    console.log('🎨 Generating Mermaid code...')
    const result = await generateDiagram(codeContext)
    
    if (result.success) {
      currentMermaidCode = result.mermaid_code
      console.log('✅ Mermaid code generated successfully')
      
      // Show success message with buttons instead of rendering diagram
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="mb-6">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Your diagram is ready!</h3>
            <p class="text-gray-600">The Mermaid diagram has been generated successfully. Choose an option below to view or edit it.</p>
          </div>
          
          <div class="flex flex-wrap justify-center gap-3">
            <button 
              onclick="openDiagramView()" 
              class="btn-primary flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <span>Open Diagram</span>
            </button>
            
             
            
            
            
            
          </div>
        </div>
      `
    } else {
      throw new Error(result.message || 'Failed to generate Mermaid code')
    }
  } catch (error) {
    console.error('❌ Mermaid code generation failed:', error)
    showError('Failed to generate Mermaid code: ' + error.message)
  }
}

// UNUSED: Old diagram rendering function - replaced with success message approach
/*
function renderMermaidDiagram() {
  const container = document.getElementById('mermaidContainer')
  if (!container || !currentMermaidCode) return

  // Clear previous content
  container.innerHTML = ''

  // Create tabs for both diagram and code
  container.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <!-- Tab Navigation -->
      <div class="flex border-b border-gray-200">
        <button 
          onclick="showDiagramTab()" 
          id="diagramTab" 
          class="flex-1 px-4 py-3 text-sm font-medium text-center bg-blue-50 text-blue-700 border-b-2 border-blue-500"
        >
          🎨 Diagram View
        </button>
        <button 
          onclick="showCodeTab()" 
          id="codeTab" 
          class="flex-1 px-4 py-3 text-sm font-medium text-center text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        >
          📝 Code View
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="p-6">
        <!-- Diagram Tab Content -->
        <div id="diagramContent" class="tab-content">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-gray-800 font-semibold text-lg">📊 Generated Mermaid Diagram</h3>
            <div class="flex space-x-2">
              <button 
                onclick="copyMermaidCode()" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                📋 Copy Code
              </button>
              <button 
                onclick="openInMermaidLive()" 
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🌐 Open in Mermaid Live
              </button>
              <button 
                onclick="openInNewTab()" 
                class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🔗 Open in New Tab
              </button>
              <button 
                onclick="downloadMermaidCode()" 
                class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                💾 Download Code
              </button>
            </div>
          </div>
          
          <!-- Diagram Container -->
          <div id="mermaidDiagram" class="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-gray-600">Loading diagram...</p>
            </div>
          </div>
        </div>
        
        <!-- Code Tab Content -->
        <div id="codeContent" class="tab-content hidden">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-gray-800 font-semibold text-lg">📝 Generated Mermaid Code</h3>
            <div class="flex space-x-2">
              <button 
                onclick="copyMermaidCode()" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                📋 Copy Code
              </button>
              <button 
                onclick="openInMermaidLive()" 
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🌐 Open in Mermaid Live
              </button>
              <button 
                onclick="downloadMermaidCode()" 
                class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                💾 Download Code
              </button>
            </div>
          </div>
          
          <p class="text-gray-700 text-sm mb-4">
            Copy this code and paste it into 
            <a href="https://mermaid.live" target="_blank" class="underline hover:text-blue-900">Mermaid Live Editor</a> 
            or any Mermaid-compatible tool.
          </p>
          
          <div class="relative">
            <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed"><code id="mermaidCode">${currentMermaidCode}</code></pre>
            <div class="absolute top-2 right-2">
              <span class="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">Mermaid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  // Load the diagram
  loadMermaidDiagram()
  console.log('✅ Mermaid diagram interface loaded successfully')
}
*/

// UNUSED: Old diagram loading function - replaced with direct URL opening approach
/*
function loadMermaidDiagram() {
  const diagramContainer = document.getElementById('mermaidDiagram')
  if (!diagramContainer || !currentMermaidCode) return

  try {
    // Generate Mermaid Live URL using pako compression
    const mermaidLiveUrl = generatePakoMermaidLiveUrl(currentMermaidCode)
    
    console.log('🎨 Generated Mermaid Live URL:', mermaidLiveUrl)
    
    // Create iframe to embed Mermaid Live
    const iframe = document.createElement('iframe')
    iframe.src = mermaidLiveUrl
    iframe.className = 'w-full h-full min-h-[500px] border-0 rounded-lg'
    iframe.style.border = 'none'
    iframe.title = 'Mermaid Diagram'
    
    // Handle loading
    iframe.onload = () => {
      console.log('✅ Mermaid Live iframe loaded successfully')
    }
    
    // Handle error
    iframe.onerror = () => {
      diagramContainer.innerHTML = `
        <div class="text-center text-red-600">
          <p class="mb-2">❌ Failed to load Mermaid Live</p>
          <p class="text-sm">Please try opening in a new tab</p>
          <button 
            onclick="openInMermaidLive()" 
            class="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            🌐 Open in New Tab
          </button>
        </div>
      `
      console.error('❌ Failed to load Mermaid Live iframe')
    }
    
    // Clear container and add iframe
    diagramContainer.innerHTML = ''
    diagramContainer.appendChild(iframe)
    
  } catch (error) {
    console.error('❌ Error generating Mermaid Live URL:', error)
    diagramContainer.innerHTML = `
      <div class="text-center text-red-600">
        <p class="mb-2">❌ Error processing diagram</p>
        <p class="text-sm">Please try opening in Mermaid Live</p>
        <button 
          onclick="openInMermaidLive()" 
          class="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          🌐 Open in Mermaid Live
        </button>
      </div>
    `
  }
}
*/

function generatePakoMermaidLiveUrl(graphMarkdown, mode = 'view') {
  try {
    // Create the JSON structure for Mermaid Live
    const jGraph = {
      "code": graphMarkdown,
      "mermaid": {"theme": "default"}
    }
    
    // Convert to JSON string and then to bytes
    const jsonString = JSON.stringify(jGraph)
    const byteStr = new TextEncoder().encode(jsonString)
    
    // Compress using pako (gzip compression)
    const deflated = pako.gzip(byteStr)
    
    // Base64 encode
    const base64Encoded = btoa(String.fromCharCode(...deflated))
    
    // Create the final URL with proper character replacement
    const link = `https://mermaid.live/${mode}#pako:` + base64Encoded.replace(/\+/g, '-').replace(/\//g, '_')
    
    console.log(`🔗 Generated pako URL (${mode} mode):`, link)
    return link
    
  } catch (error) {
    console.error('❌ Error generating pako URL:', error)
    // Fallback to simple URL encoding
    return `https://mermaid.live/${mode}#pako:${encodeURIComponent(graphMarkdown)}`
  }
}

function showDiagramTab() {
  document.getElementById('diagramTab').className = 'flex-1 px-4 py-3 text-sm font-medium text-center bg-blue-50 text-blue-700 border-b-2 border-blue-500'
  document.getElementById('codeTab').className = 'flex-1 px-4 py-3 text-sm font-medium text-center text-gray-500 hover:text-gray-700 hover:bg-gray-50'
  document.getElementById('diagramContent').className = 'tab-content'
  document.getElementById('codeContent').className = 'tab-content hidden'
}

function showCodeTab() {
  document.getElementById('codeTab').className = 'flex-1 px-4 py-3 text-sm font-medium text-center bg-blue-50 text-blue-700 border-b-2 border-blue-500'
  document.getElementById('diagramTab').className = 'flex-1 px-4 py-3 text-sm font-medium text-center text-gray-500 hover:text-gray-700 hover:bg-gray-50'
  document.getElementById('codeContent').className = 'tab-content'
  document.getElementById('diagramContent').className = 'tab-content hidden'
}

function handleReset() {
  currentRepository = null
  currentFiles = []
  currentAnalysis = null
  currentMermaidCode = ''
  renderApp()
}

function handleCopyCode() {
  if (currentMermaidCode) {
    navigator.clipboard.writeText(currentMermaidCode)
    // You could add a toast notification here
    alert('Mermaid code copied to clipboard!')
  }
}

function handleDownloadDiagram() {
  if (currentMermaidCode) {
    const blob = new Blob([currentMermaidCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentRepository.name}-diagram.mmd`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

function generateMermaidLiveUrl(mermaidCode) {
  return generatePakoMermaidLiveUrl(mermaidCode)
}

function handleOpenInMermaidLive() {
  if (currentMermaidCode) {
    const mermaidLiveUrl = generateMermaidLiveUrl(currentMermaidCode)
    window.open(mermaidLiveUrl, '_blank')
  }
}

function openInNewTab() {
  if (currentMermaidCode) {
    const mermaidLiveUrl = generatePakoMermaidLiveUrl(currentMermaidCode, 'view')
    window.open(mermaidLiveUrl, '_blank')
    console.log('🔗 Opening diagram in view mode:', mermaidLiveUrl)
  }
}

// Helper functions for diagram actions
function openDiagramView() {
  if (!currentMermaidCode) return;
  const url = generatePakoMermaidLiveUrl(currentMermaidCode, 'view');
  window.open(url, '_blank');
  console.log('🔗 Opened diagram in VIEW mode:', url);
}

function openDiagramEdit() {
  if (!currentMermaidCode) return;
  const url = generatePakoMermaidLiveUrl(currentMermaidCode, 'edit');
  window.open(url, '_blank');
  console.log('🔗 Opened diagram in EDIT mode:', url);
}

// Helper functions for the new buttons
function copyMermaidCode() {
  if (currentMermaidCode) {
    navigator.clipboard.writeText(currentMermaidCode).then(() => {
      // Show success feedback
      const button = event.target
      const originalText = button.textContent
      button.textContent = '✅ Copied!'
      button.classList.add('bg-green-600')
      button.classList.remove('bg-blue-600')
      
      setTimeout(() => {
        button.textContent = originalText
        button.classList.remove('bg-green-600')
        button.classList.add('bg-blue-600')
      }, 2000)
    }).catch(err => {
      console.error('Failed to copy code:', err)
      alert('Failed to copy code. Please try selecting and copying manually.')
    })
  }
}

function openInMermaidLive() {
  handleOpenInMermaidLive()
}

function downloadMermaidCode() {
  if (currentMermaidCode) {
    const blob = new Blob([currentMermaidCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mermaid-diagram.mmd'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage')
  if (errorDiv) {
    errorDiv.textContent = message
    errorDiv.classList.remove('hidden')
  }
}

function hideError() {
  const errorDiv = document.getElementById('errorMessage')
  if (errorDiv) {
    errorDiv.classList.add('hidden')
  }
}

function showLoading(show) {
  const loadingDiv = document.getElementById('loadingMessage')
  if (loadingDiv) {
    if (show) {
      loadingDiv.classList.remove('hidden')
    } else {
      loadingDiv.classList.add('hidden')
    }
  }
}

// Expose functions globally for inline onclick handlers
Object.assign(window, {
  openDiagramView,
  openDiagramEdit,
  handleCopyCode,
  handleDownloadDiagram,
  copyMermaidCode,
  openInMermaidLive,
  openInNewTab,
  downloadMermaidCode,
  handleOpenInMermaidLive,
})

// Initialize the app
renderApp()
