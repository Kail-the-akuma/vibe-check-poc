#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { SecurityAuditor } from './security_vibe.js';
import { ProjectScanner } from './scanner.js';

dotenv.config();

const target = process.argv[2];

if (!target) {
  console.log(chalk.red('Usage: vibe-check <file-or-directory-path>'));
  process.exit(1);
}

const auditor = new SecurityAuditor();
const scanner = new ProjectScanner();

async function runAudit(filePath) {
  try {
    const relPath = path.relative(process.cwd(), filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const result = await auditor.analyze(content, ext, relPath);
    return { filePath, ...result };
  } catch (error) {
    return { filePath, error: error.message, overallVibe: 'ERROR' };
  }
}

async function run() {
  try {
    try {
      await fs.access(target);
    } catch {
      console.log(chalk.red(`Error: Path ${target} does not exist.`));
      process.exit(1);
    }

    const stat = await fs.stat(target);
    let filesToScan = [];

    if (stat.isDirectory()) {
      console.log(chalk.blue(`\n📂 Scanning directory: ${path.resolve(target)}`));
      filesToScan = await scanner.scan(target);
    } else {
      filesToScan = [path.resolve(target)];
    }

    const totalFiles = filesToScan.length;
    console.log(chalk.blue(`Found ${totalFiles} files to analyze...\n`));

    // Concurrency control: process files in batches of 5
    const batchSize = 5;
    let totalIssues = 0;
    let scannedCount = 0;

    for (let i = 0; i < filesToScan.length; i += batchSize) {
      const batch = filesToScan.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(file => runAudit(file)));

      for (const result of results) {
        scannedCount++;
        const relPath = path.relative(process.cwd(), result.filePath);
        
        if (result.overallVibe !== 'SAFE') {
          console.log(chalk.yellow(`[${scannedCount}/${totalFiles}] ⚠️  Issues found in ${relPath}:`));
          
          if (result.exposedCredentials?.length > 0) {
            totalIssues += result.exposedCredentials.length;
            result.exposedCredentials.forEach(cred => {
              console.log(chalk.red(`   - [Line ${cred.line}] Credential: ${cred.value}`));
            });
          }

          if (result.owaspFindings?.length > 0) {
            totalIssues += result.owaspFindings.length;
            result.owaspFindings.forEach(finding => {
              console.log(chalk.red(`   - [${finding.id}] ${finding.title}: ${finding.detail}`));
              if (finding.fix) {
                console.log(chalk.cyan(`     💡 Fix: ${finding.fix}`));
              }
            });
          }
          
          if (result.error) {
            console.log(chalk.red(`   - Error: ${result.error}`));
          }
          console.log('');
        } else {
          console.log(chalk.gray(`[${scannedCount}/${totalFiles}] ✅ ${relPath} is safe.`));
        }
      }
    }

    console.log(chalk.green('\n--- Audit Complete ---'));
    console.log(chalk.white(`Files Scanned: ${totalFiles}`));
    console.log(totalIssues > 0 ? chalk.red(`Total Issues Found: ${totalIssues}`) : chalk.green('No issues found! 🎉'));

  } catch (error) {
    console.error(chalk.red(`Fatal Error: ${error.message}`));
  }
}

run();
