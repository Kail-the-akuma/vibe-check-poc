import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SecurityAuditor handles actual AI-powered security analysis using OpenAI.
 */
export class SecurityAuditor {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.error('CRITICAL: OPENAI_API_KEY is not defined in .env');
    } else {
      console.log('API Key loaded successfully (length: ' + process.env.OPENAI_API_KEY.length + ')');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyzes the given code for injections, exposed credentials, and OWASP Top 10 risks.
   * @param {string} content The code content to analyze.
   * @param {string} ext The file extension (to provide context).
   */
  async analyze(content, ext) {
    const results = {
      exposedCredentials: [],
      owaspFindings: [],
      overallVibe: 'SAFE',
    };

    // 1. Initial Local Check for Secrets (Fast & Free)
    const secretPatterns = [
      /(?:apiKey|secret|password|token|connectionString|pwd)\s*[:=]\s*["']([^"']{8,})["']/gi,
      /[A-Za-z0-9+/]{40}/g,
    ];

    let match;
    for (const pattern of secretPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        results.exposedCredentials.push({
          type: 'Hardcoded Secret',
          value: match[0].trim(),
          line: this.getLineNumber(content, match.index),
        });
      }
    }

    // 2. Real AI OWASP Evaluation
    try {
      console.log('--- Calling OpenAI for security check ---');
      const owaspFindings = await this.evaluateOWASP(content, ext);
      results.owaspFindings = owaspFindings;
    } catch (error) {
      console.error('--- OpenAI call failed ---');
      console.error('Error Details:', error.message);
    }

    if (results.exposedCredentials.length > 0 || results.owaspFindings.length > 0) {
      results.overallVibe = 'SUSPICIOUS';
    }

    return results;
  }

  async evaluateOWASP(content, ext) {
    // Keeping tokens minimal with a strict system prompt and short response format
    const systemPrompt = `You are a security auditor. Analyze the following ${ext} code for OWASP Top 10 vulnerabilities. 
    Return a JSON object with a key "findings" containing an array of finding objects.
    Each finding must have: "id" (OWASP ID), "title", "detail" (max 15 words), and "severity" (CRITICAL/HIGH/MEDIUM/LOW). 
    If no findings, return {"findings": []}. 
    Do not include any conversational text.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
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
