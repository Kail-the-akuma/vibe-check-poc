import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SecurityAuditor handles actual AI-powered security analysis using OpenAI.
 */
export class SecurityAuditor {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // 🛡️ Security Gate: If you want to restrict the tool to your own key
    const masterKey = process.env.VIBE_MASTER_KEY;
    if (masterKey && masterKey !== 'Hugo-The-Architect') {
      console.warn('⚠️ Warning: Unauthorized master key. Reverting to local user mode.');
      this.apiKey = null; // Forces the person to use their own key
    }

    if (!this.apiKey && this.baseUrl.includes('openai.com')) {
      this.showSetupWizard();
      process.exit(1);
    }

    this.openai = new OpenAI({
      apiKey: this.apiKey || 'not-required-for-local',
      baseURL: this.baseUrl,
    });
    this.cacheFile = path.resolve(process.cwd(), '.vibe-cache.json');
    this.cache = this.loadCache();
  }

  showSetupWizard() {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 VIBE-CHECK SETUP WIZARD');
    console.log('='.repeat(50));
    console.log('\nAPI Key missing! To use VibeCheck, please choose one:');
    
    console.log('\nOption A: Use OpenAI (Recommended)');
    console.log('1. Get a key at https://platform.openai.com/');
    console.log('2. Add it to .env: OPENAI_API_KEY=your_key_here');
    
    console.log('\nOption B: Use Local LLM (Privacy First)');
    console.log('1. Install Ollama (https://ollama.com/)');
    console.log('2. Run: ollama run llama3');
    console.log('3. Add to .env:');
    console.log('   OPENAI_BASE_URL=http://localhost:11434/v1');
    console.log('   OPENAI_MODEL=llama3');
    console.log('   OPENAI_API_KEY=ollama');
    
    console.log('\nOption C: Use LM Studio');
    console.log('1. Open LM Studio and start the Local Server.');
    console.log('2. Add to .env: OPENAI_BASE_URL=http://localhost:1234/v1');
    console.log('\n' + '='.repeat(50) + '\n');
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
    } catch (e) {
      console.warn('Could not load cache, starting fresh.');
    }
    return {};
  }

  saveCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      console.error('Failed to save cache:', e.message);
    }
  }

  getHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Cleans code to minimize tokens: strips excessive whitespace and empty lines.
   */
  cleanCode(content) {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Analyzes the given code for injections, exposed credentials, and architectural rules.
   * @param {string} content The code content to analyze.
   * @param {string} ext The file extension (to provide context).
   * @param {string} relativePath The relative path of the file (for architectural context).
   */
  async analyze(content, ext, relativePath) {
    const results = {
      exposedCredentials: [],
      owaspFindings: [],
      overallVibe: 'SAFE',
    };

    // 1. Initial Local Check for Secrets (Comprehensive Regex Suite)
    const secretPatterns = [
      // Generic Keywords
      { name: 'Generic Secret', regex: /(?:apiKey|secret|password|token|connectionString|pwd|access_key|secret_key|session_token|authorization|db_url)\s*[:=]\s*["']([^"']{8,})["']/gi },
      
      // Cloud Providers
      { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'AWS Secret Key', regex: /["']?[A-Za-z0-9/+=]{40}["']?/g }, // Use with caution, can have false positives
      { name: 'Google Cloud API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/g },
      
      // Database Connection Strings
      { name: 'Postgres Connection String', regex: /postgres:\/\/[^:]+:[^@]+@[^/]+\/[^?\s]+/gi },
      { name: 'MongoDB Connection String', regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^/]+/gi },
      { name: 'SQL Server Connection String', regex: /Server=[^;]+;Database=[^;]+;User Id=[^;]+;Password=[^;]+/gi },
      
      // Tokens & Others
      { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g },
      { name: 'GitHub Token', regex: /gh[pous]_[a-zA-Z0-9]{36}/g },
      { name: 'Stripe API Key', regex: /sk_live_[0-9a-zA-Z]{24}/g },
      { name: 'JWT Token', regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g },
    ];

    for (const pattern of secretPatterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        results.exposedCredentials.push({
          type: pattern.name,
          value: match[0].trim(),
          line: this.getLineNumber(content, match.index),
        });
      }
    }

    // 2. Real AI OWASP Evaluation (with Caching & Optimization)
    try {
      const contentHash = this.getHash(content);
      
      if (this.cache[contentHash]) {
        console.log('--- Using cached result for this file ---');
        results.owaspFindings = this.cache[contentHash];
      } else {
        console.log('--- Calling OpenAI for security check ---');
        const optimizedContent = this.cleanCode(content);
        const owaspFindings = await this.evaluateOWASP(optimizedContent, ext, relativePath);
        
        // Only cache if there's actual data or an empty array (not an error)
        if (Array.isArray(owaspFindings)) {
          results.owaspFindings = owaspFindings;
          this.cache[contentHash] = owaspFindings;
          this.saveCache();
        }
      }
    } catch (error) {
      console.error('--- OpenAI call failed ---');
      console.error('Error Details:', error.message);
    }

    if (results.exposedCredentials.length > 0 || results.owaspFindings.length > 0) {
      results.overallVibe = 'SUSPICIOUS';
    }

    return results;
  }

  async evaluateOWASP(content, ext, relativePath) {
    // Keeping tokens minimal with a strict system prompt and short response format
    const systemPrompt = `You are a high-level security and software architect.
    Analyze the following ${ext} code from the path "${relativePath}".
    
    Audit Categories:
    1. **Security (OWASP/LLM)**: XSS, SQLi, Prompt Injection, Excessive Agency, Secrets.
    2. **Architecture Rule Enforcement**: Layer boundaries, CQRS, DDD, Domain Isolation.
    3. **Code Quality & Best Practices**:
       - **Guard Clauses**: Identify "Arrow Code" (deeply nested ifs). Recommend early returns (Guard Clauses) to improve readability.
       - **DRY Principle**: Flag repeated logic or code that should be abstracted into a reusable function/class.
       - **Switch-Case Optimization**: Recommend 'switch' statements for chains of 3+ 'if-else' blocks on the same variable.
       - **OOP Principles**: Flag procedural code that ignores object-oriented principles (e.g., passing too many primitives instead of an object).
       - **Naming Conventions**: Ensure classes/files match their role (e.g., Controllers end with 'Controller').

    Output Rules:
    - Return ONLY a valid JSON object with a "findings" key.
    - Each finding MUST include: 
        - "id": (e.g., SEC-XSS, ARCH-LAYER, ARCH-DDD)
        - "title": Concise name.
        - "detail": Description (max 15 words).
        - "severity": (CRITICAL/HIGH/MEDIUM/LOW).
        - "fix": A concise recommendation or code snippet (max 25 words).
    - If no issues, return {"findings": []}.
    - DO NOT include markdown or chat text.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    console.log('OpenAI Call Successful. RequestID:', response.id);

    try {
      const parsed = JSON.parse(response.choices[0].message.content);
      // Handle various JSON wrapper styles if AI returns { findings: [] } or just []
      return Array.isArray(parsed) ? parsed : (parsed.findings || Object.values(parsed)[0] || []);
    } catch (e) {
      return [];
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }
}
