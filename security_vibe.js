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
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
      }
    };

    // 1. Initial Local Check for Secrets (Comprehensive Regex Suite)
    const secretPatterns = [
      // Generic Keywords
      { name: 'Generic Secret', regex: /(?:apiKey|secret|password|token|connectionString|pwd|access_key|secret_key|session_token|authorization|db_url)\s*[:=]\s*["']([^"']{8,})["']/gi },
      
      // Cloud Providers
      { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'AWS Secret Key', regex: /["']?[A-Za-z0-9/+=]{40}["']?/g }, 
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
          severity: 'CRITICAL',
          impact: 'Critical data exposure.',
          remediation: 'Revoke key and move to .env file.',
          fixCode: `// Use environment variable instead:\nconst key = process.env.${pattern.name.toUpperCase().replace(/\s+/g, '_')};`
        });
      }
    }

    // 2. Real AI OWASP Evaluation (with Caching & Optimization)
    try {
      const contentHash = this.getHash(content);
      
      if (this.cache[contentHash] && this.cache[contentHash].some(f => f.remediation)) {
        console.log('--- Using cached result for this file ---');
        results.owaspFindings = this.cache[contentHash];
      } else {
        console.log('--- Calling OpenAI for security check ---');
        const optimizedContent = this.cleanCode(content);
        const owaspFindings = await this.evaluateOWASP(optimizedContent, ext, relativePath);
        
        if (Array.isArray(owaspFindings)) {
          results.owaspFindings = owaspFindings;
          this.cache[contentHash] = owaspFindings;
          this.saveCache();
        }
      }
    } catch (error) {
      console.error('--- OpenAI call failed ---');
    }

    // 3. Always calculate summary at the end to ensure consistency
    const secretLines = new Set(results.exposedCredentials.map(c => c.line));
    
    const filteredAI = results.owaspFindings.filter(f => {
      if (f.id === 'SEC-SECRETS' || f.title?.toLowerCase().includes('secret')) {
        if (secretLines.has(f.line)) return false; 
      }
      return true;
    });

    results.owaspFindings = filteredAI;

    results.exposedCredentials.forEach(() => results.summary.critical++);
    results.owaspFindings.forEach(f => {
      const sev = (f.severity || 'MEDIUM').toUpperCase();
      const sevLower = sev.toLowerCase();
      if (results.summary[sevLower] !== undefined) {
        results.summary[sevLower]++;
      } else {
        results.summary.medium++;
      }
    });

    if (results.exposedCredentials.length > 0 || results.owaspFindings.length > 0) {
      results.overallVibe = 'SUSPICIOUS';
    }

    return results;
  }

  async evaluateOWASP(content, ext, relativePath) {
    const systemPrompt = `You are a strict security architect.
    Analyze the following ${ext} code at "${relativePath}".
    
    Focus on:
    1. Security (OWASP/LLM)
    2. Architecture (DDD/CQRS)
    3. Code Quality (Guard Clauses, DRY, OOP)

    Output Rules:
    - JSON object with "findings" key.
    - Each finding: 
        - "id": string
        - "title": Concise name.
        - "detail": Max 15 words.
        - "severity": CRITICAL/HIGH/MEDIUM/LOW
        - "impact": Max 15 words.
        - "remediation": Concise fix steps (max 20 words).
        - "fixCode": One specific code snippet showing the fix.
        - "line": integer.
    - KEEP IT BRIEF. No chat, no markdown. Use placeholders for long code.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    try {
      const parsed = JSON.parse(response.choices[0].message.content);
      return parsed.findings || [];
    } catch (e) {
      return [];
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }
}
