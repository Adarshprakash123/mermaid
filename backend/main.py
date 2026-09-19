from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import requests
import re
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Code-to-Mermaid Generator API",
    description="Extract GitHub repositories and generate Mermaid diagrams using AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDHaenIhEkyS7CXaem6-Mb43Kz-Y4tQRsk")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Pydantic models
class DiagramResponse(BaseModel):
    success: bool
    mermaid_code: str
    diagram_type: str
    message: str

# Expert prompt for Mermaid generation
EXPERT_PROMPT = """You are an expert **code analyzer** and **diagram generator**. Your job is to read provided source code and generate the most accurate, concise, and logically organized **Mermaid diagram** representation of that code.  
Follow all the rules, analysis steps, and output formatting instructions below exactly.  
Return only Mermaid code — no explanations, commentary, markdown formatting, or any other text.

================================================================================
INSTRUCTIONS
================================================================================

1. Analyze the provided code structure, patterns, and logic flow.
2. Determine the most appropriate diagram type (Flowchart, Class, Sequence, ER, or Module Flow) based on the code and the user's selection context.
3. Generate clean, well-structured, valid Mermaid syntax that accurately reflects the code's structure.
4. Return **only** the Mermaid code — do not include explanations, markdown fences, or extra text.
5. Ensure the diagram is **readable**, **logical**, and **well organized**.
6. Node names must be clear, concise, and human-understandable — avoid dumping raw code or long expressions as labels.
7. Avoid using parentheses, brackets, braces, asterisks, quotes, or equals signs in node names.
8. Example: instead of  
   `E[check len(arr)]`  
   use  
   `E[check array length]`.
9. Combine multi-word identifiers with underscores:  
   `E[declare first_variable]` instead of `E[declare first variable]`.
10. Show all decision outcomes clearly with labeled branches ("Yes/No", "True/False", etc.).
11. Group related lines of code into single nodes representing their collective purpose.
12. Reflect variables, functions, and class names exactly as defined in the code (case-sensitive).
13. If multiple variables are initialized together, combine them into one node separated by commas.
14. The diagram must render correctly in Mermaid — test mentally for syntax validity.
15. Avoid adding extra stylistic syntax or Markdown formatting; output should be raw Mermaid only.

================================================================================
USER SELECTION TYPE LOGIC
================================================================================

Determine what portion of the code the user selected and adapt the diagram level accordingly:

• If the user provided the **entire file**, create a **File-Level Diagram** showing overall flow or module interactions.  
• If the user provided a **function or class**, create a **Function-Level Diagram** showing internal logic, loops, and conditionals.  
• If the user provided only a **small block** within a function, create a **Code-Block-Level Diagram** focusing on that segment's internal logic.  

Always infer the correct level automatically.

================================================================================
DIAGRAM TYPE SELECTION CRITERIA
================================================================================

Use the following mapping guidelines:

• Procedural or logic-driven code → **Flowchart**
• Object-oriented code (classes, inheritance) → **Class Diagram**
• Database or ORM models → **Entity-Relationship (ER) Diagram**
• Asynchronous or message-passing code → **Sequence Diagram**
• Modular or multi-file systems → **Architecture/Module Flow Diagram**

If unsure, default to generating a **Flowchart**.

================================================================================
ANALYSIS GUIDELINES
================================================================================

1. Examine indentation, keywords, and control structures to infer logic flow.
2. Identify the main entry point (start of function, main block, or initialization).
3. Represent:
   • Start / End → terminal nodes  
   • Actions or operations → process nodes  
   • Input / Output → parallelogram nodes  
   • Decisions / branches → diamond nodes  
   • Loops → diamond nodes with return arrows  
   • Function calls → rectangular nodes labeled with called function names
4. Every conditional branch must show both outcomes (Yes/No or True/False).
5. Keep flow direction consistent — **flowchart TD** (top-down) unless otherwise needed.
6. Represent nested logic accurately by indentation or subgraph structure if appropriate.
7. When code imports or interacts with external modules, APIs, or databases, show those as external nodes.
8. For class diagrams:
   • Each class is a box node with attributes and methods grouped.
   • Show relationships:
       - Inheritance → `--|>`
       - Association → `-->`
       - Dependency → `..>`
9. For sequence diagrams:
   • Show actors (modules/functions) at top.
   • Represent messages or function calls with arrows.
   • Use activation bars when appropriate (optional).
10. For ER diagrams:
   • Show tables/entities as nodes.
   • Show keys (PK, FK) with appropriate labels.
   • Represent one-to-many and many-to-many with correct connectors.
11. For architecture/module diagrams:
   • Show modules or files as main nodes.
   • Connect them according to imports or dependencies.
   • Represent external services, APIs, or frameworks as outer nodes.

================================================================================
NAMING & STYLING RULES
================================================================================

1. Keep all node names short (3–8 words max).
2. No punctuation except underscore (_) and space.
3. Avoid markdown, special symbols, and reserved Mermaid characters inside labels.
4. Maintain consistent verb–noun structure for actions (e.g., "Initialize variable", "Check condition", "Return result").
5. Never duplicate nodes with identical meaning — merge repeated actions.
6. Merge parallel branches that rejoin logically.
7. Use plain English phrasing where possible rather than exact code tokens.
8. Represent repeated loops with descriptive labels ("iterate over items", "loop through array").
9. Keep directionality clear and minimal crossing of arrows.

================================================================================
OUTPUT FORMAT
================================================================================

• Output **only the Mermaid diagram**.  
• Do not include explanations, markdown code fences, or extra commentary.  
• Use one of the following valid structures depending on diagram type:

Example (Flowchart):
flowchart TD
    A(Start) --> B[Initialize variables]
    B --> C{Check condition}
    C -->|True| D[Execute block A]
    C -->|False| E[Execute block B]
    D --> F(End)
    E --> F(End)

Example (Class Diagram):
classDiagram
    class User {
        +id : int
        +name : string
        +login()
    }
    class AuthService {
        +authenticate()
    }
    User --> AuthService : uses

Example (Sequence Diagram):
sequenceDiagram
    participant Client
    participant Server
    Client->>Server: Send request
    Server-->>Client: Return response

================================================================================
VALIDATION RULES
================================================================================

1. All Mermaid syntax must compile without error.
2. Each diagram must include a clear start and end unless inherently continuous (e.g., class or ER diagrams).
3. Avoid empty or duplicate nodes.
4. If code is incomplete, infer missing pieces conservatively without inventing new logic.
5. Always maintain logical consistency and clarity of flow.

================================================================================
FINAL TASK
================================================================================

After reading the provided code:
• Identify its logical or structural level.
• Select the appropriate diagram type.
• Generate accurate, readable, and valid Mermaid code representing its structure.
• Return nothing except the Mermaid diagram text.

================================================================================
END OF PROMPT
==============================================================================="""

def extract_github_info(repo_url):
    """Extract owner and repo name from GitHub URL"""
    # Handle different GitHub URL formats
    patterns = [
        r'github\.com/([^/]+)/([^/]+)',
        r'github\.com/([^/]+)/([^/]+)/?$',
        r'github\.com/([^/]+)/([^/]+)/tree/',
        r'github\.com/([^/]+)/([^/]+)/blob/',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, repo_url)
        if match:
            return match.group(1), match.group(2)
    
    raise ValueError("Invalid GitHub repository URL")

def get_github_file_content(owner, repo, path, token=None):
    """Get file content from GitHub API"""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data.get("type") == "file":
            import base64
            content = base64.b64decode(data["content"]).decode("utf-8")
            return content
    return None

def get_github_repo_files(owner, repo, token=None):
    """Get all files from GitHub repository"""
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
    
    response = requests.get(url, headers=headers)
    if response.status_code == 403:
        raise HTTPException(status_code=400, detail="GitHub API rate limit exceeded. Please add a GitHub Personal Access Token.")
    elif response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch repository files")
    
    data = response.json()
    files = []
    
    # Filter for supported file extensions
    supported_extensions = os.getenv("SUPPORTED_EXTENSIONS", ".py,.js,.ts,.java,.cpp,.c,.h,.hpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.scala,.sh,.sql,.html,.css,.vue,.jsx,.tsx").split(",")
    
    for item in data.get("tree", []):
        if item["type"] == "blob":  # It's a file
            file_path = item["path"]
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext in supported_extensions:
                files.append({
                    "path": file_path,
                    "name": os.path.basename(file_path),
                    "size": item.get("size", 0),
                    "type": "file"
                })
    
    return files

def get_github_repo_info(owner, repo, token=None):
    """Get repository information"""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
    
    print(f"📥 Fetching repository info from: {url}")
    response = requests.get(url, headers=headers)
    print(f"📥 GitHub API response status: {response.status_code}")
    
    if response.status_code == 404:
        raise HTTPException(status_code=400, detail=f"Repository '{owner}/{repo}' not found. Please check if the repository exists and is public.")
    elif response.status_code == 403:
        # Check if it's a rate limit issue
        if "rate limit" in response.text.lower() or "api rate limit" in response.text.lower():
            raise HTTPException(
                status_code=400, 
                detail="GitHub API rate limit exceeded. Please add a GitHub Personal Access Token to your environment to increase the rate limit from 60 to 5000 requests per hour. You can create one at: https://github.com/settings/tokens"
            )
        else:
            raise HTTPException(status_code=400, detail="GitHub API access forbidden. The repository might be private or you need authentication.")
    elif response.status_code != 200:
        error_detail = response.text
        print(f"❌ GitHub API error: {error_detail}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository information: {error_detail}")
    
    data = response.json()
    return {
        "name": data["name"],
        "full_name": data["full_name"],
        "description": data.get("description", ""),
        "language": data.get("language", ""),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "url": data["html_url"],
        "clone_url": data["clone_url"],
        "default_branch": data.get("default_branch", "main")
    }

def analyze_code(files, owner, repo, token=None):
    """Analyze code structure and patterns"""
    analysis = {
        "total_files": len(files),
        "total_lines": 0,
        "file_types": set(),
        "languages": set(),
        "classes": set(),
        "functions": set(),
        "dependencies": set(),
        "complexity_score": 0,
        "architecture_patterns": set()
    }
    
    # Get content for first 10 files (to avoid API limits)
    max_files = min(10, len(files))
    
    for i, file_info in enumerate(files[:max_files]):
        if i >= max_files:
            break
            
        file_path = file_info["path"]
        content = get_github_file_content(owner, repo, file_path, token)
        
        if content:
            # Count lines
            lines = content.split('\n')
            analysis["total_lines"] += len(lines)
            
            # File type
            file_ext = os.path.splitext(file_path)[1].lower()
            analysis["file_types"].add(file_ext)
            
            # Language detection based on extension
            lang_map = {
                '.py': 'Python', '.js': 'JavaScript', '.ts': 'TypeScript',
                '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.cs': 'C#',
                '.go': 'Go', '.rs': 'Rust', '.php': 'PHP', '.rb': 'Ruby',
                '.swift': 'Swift', '.kt': 'Kotlin', '.scala': 'Scala',
                '.html': 'HTML', '.css': 'CSS', '.vue': 'Vue', '.jsx': 'JSX', '.tsx': 'TSX'
            }
            if file_ext in lang_map:
                analysis["languages"].add(lang_map[file_ext])
            
            # Simple pattern detection
            if file_ext == '.py':
                # Python patterns
                class_matches = re.findall(r'class\s+(\w+)', content)
                analysis["classes"].update(class_matches)
                
                func_matches = re.findall(r'def\s+(\w+)', content)
                analysis["functions"].update(func_matches)
                
                import_matches = re.findall(r'import\s+(\w+)', content)
                analysis["dependencies"].update(import_matches)
                
            elif file_ext in ['.js', '.ts']:
                # JavaScript/TypeScript patterns
                class_matches = re.findall(r'class\s+(\w+)', content)
                analysis["classes"].update(class_matches)
                
                func_matches = re.findall(r'function\s+(\w+)|const\s+(\w+)\s*=\s*\(', content)
                analysis["functions"].update([m[0] or m[1] for m in func_matches])
                
                import_matches = re.findall(r'import.*from\s+[\'"]([^\'"]+)[\'"]', content)
                analysis["dependencies"].update(import_matches)
    
    # Convert sets to lists for JSON serialization
    analysis["file_types"] = list(analysis["file_types"])
    analysis["languages"] = list(analysis["languages"])
    analysis["classes"] = list(analysis["classes"])
    analysis["functions"] = list(analysis["functions"])
    analysis["dependencies"] = list(analysis["dependencies"])
    analysis["architecture_patterns"] = list(analysis["architecture_patterns"])
    
    # Calculate complexity score
    analysis["complexity_score"] = min(100, analysis["total_files"] + len(analysis["classes"]) + len(analysis["functions"]))
    
    return analysis

def generate_mermaid_diagram(code_context):
    """Generate Mermaid diagram using Gemini AI"""
    try:
        print(f"🔑 Using Gemini API key: {GEMINI_API_KEY[:10]}...")
        print(f"📝 Code context length: {len(code_context)}")
        print(f"📝 Code context preview: {code_context[:200]}...")
        
        full_prompt = f"""
{EXPERT_PROMPT}

Code Context:
{code_context}

Please analyze the provided code and generate the most appropriate Mermaid diagram.
Return ONLY the Mermaid code without any explanations or markdown formatting.
The Mermaid code should be complete and ready to render.
"""
        
        print(f"📝 Prompt length: {len(full_prompt)}")
        
        response = model.generate_content(full_prompt)
        print(f"✅ Gemini response received: {len(response.text)} characters")
        print(f"📊 Mermaid code preview: {response.text[:200]}...")
        
        mermaid_code = response.text.strip()
        
        # Clean up the response
        if "```mermaid" in mermaid_code:
            mermaid_code = mermaid_code.split("```mermaid")[1].split("```")[0].strip()
        elif "```" in mermaid_code:
            mermaid_code = mermaid_code.split("```")[1].split("```")[0].strip()
        
        print(f"✅ Final Mermaid code length: {len(mermaid_code)}")
        return mermaid_code
        
    except Exception as e:
        print(f"❌ Gemini API error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate Mermaid diagram: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Code-to-Mermaid Generator API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/analyze-repository")
async def analyze_repository(request: dict):
    """Analyze GitHub repository and extract all files with code"""
    try:
        print(f"📥 Received repository analysis request: {request}")
        print(f"📥 Request type: {type(request)}")
        print(f"📥 Request keys: {list(request.keys()) if isinstance(request, dict) else 'Not a dict'}")
        
        # Extract repo_url from request
        repo_url = request.get("repo_url", "")
        print(f"📥 Repository URL: {repo_url}")
        
        if not repo_url:
            print("❌ No repo_url provided")
            raise HTTPException(status_code=400, detail="repo_url is required")
        
        # Extract GitHub info
        owner, repo = extract_github_info(repo_url)
        print(f"📥 Extracted: owner={owner}, repo={repo}")
        
        # Get GitHub token from environment
        github_token = os.getenv("GITHUB_TOKEN")
        if github_token:
            print("📥 Using GitHub token for API requests")
        else:
            print("⚠️ No GitHub token found - using unauthenticated requests (rate limited)")
            print("💡 To get real data, add a GitHub Personal Access Token to your environment")
        
        # Get repository information
        repo_info = get_github_repo_info(owner, repo, github_token)
        print(f"📥 Repository info: {repo_info['name']}")
        
        # Get all files
        files = get_github_repo_files(owner, repo, github_token)
        print(f"📥 Found {len(files)} files")
        
        # Analyze code
        analysis = analyze_code(files, owner, repo, github_token)
        print(f"📥 Analysis complete: {analysis['total_files']} files, {analysis['total_lines']} lines")
        
        # Get content for files (limit to avoid API limits)
        max_files = min(5, len(files))
        files_with_content = []
        
        for i, file_info in enumerate(files[:max_files]):
            content = get_github_file_content(owner, repo, file_info["path"], github_token)
            if content:
                file_info["content"] = content
                file_info["language"] = analysis["languages"][0] if analysis["languages"] else "Unknown"
                files_with_content.append(file_info)
        
        print(f"📥 Returning {len(files_with_content)} files with content")
        
        return {
            "success": True,
            "repository": repo_info,
            "files": files_with_content,
            "analysis": analysis,
            "message": "Repository analyzed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Repository analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/generate-diagram", response_model=DiagramResponse)
async def generate_diagram(request: dict):
    """Generate Mermaid diagram from code context"""
    try:
        print(f"📥 Received diagram request: {type(request)}")
        print(f"📥 Request keys: {list(request.keys()) if isinstance(request, dict) else 'Not a dict'}")
        
        code_context = request.get("code_context", "")
        print(f"📥 Code context length: {len(code_context)}")
        
        if not code_context:
            print("❌ No code context provided")
            raise HTTPException(status_code=400, detail="Code context is required")
        
        print("🎨 Generating Mermaid diagram...")
        # Generate Mermaid diagram
        mermaid_code = generate_mermaid_diagram(code_context)
        print(f"✅ Generated Mermaid code length: {len(mermaid_code)}")
        
        # Determine diagram type (simple heuristic)
        if "classDiagram" in mermaid_code:
            diagram_type = "class"
        elif "sequenceDiagram" in mermaid_code:
            diagram_type = "sequence"
        elif "erDiagram" in mermaid_code:
            diagram_type = "er"
        else:
            diagram_type = "flowchart"
        
        print(f"📊 Diagram type: {diagram_type}")
        
        return DiagramResponse(
            success=True,
            mermaid_code=mermaid_code,
            diagram_type=diagram_type,
            message="Diagram generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating diagram: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
