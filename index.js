#!/usr/bin/env node

import fs from 'fs';
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
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  const result = await auditor.analyze(content, ext);
  return { filePath, ...result };
}

async function run() {
  try {
    if (!fs.existsSync(target)) {
      console.log(chalk.red(`Error: Path ${target} does not exist.`));
      process.exit(1);
    }

    const stat = fs.statSync(target);
    let filesToScan = [];

    if (stat.isDirectory()) {
      console.log(chalk.blue(`\n📂 Scanning directory: ${path.resolve(target)}`));
      filesToScan = await scanner.scan(target);
    } else {
      filesToScan = [path.resolve(target)];
    }

    console.log(chalk.blue(`Found ${filesToScan.length} files to analyze...\n`));

    for (const filePath of filesToScan) {
      const relPath = path.relative(process.cwd(), filePath);
      console.log(chalk.gray(`Analyzing ${relPath}...`));
      
      const result = await runAudit(filePath);

      if (result.overallVibe !== 'SAFE') {
        console.log(chalk.yellow(`⚠️  Issues found in ${relPath}:`));
        
        if (result.exposedCredentials.length > 0) {
          result.exposedCredentials.forEach(cred => {
            console.log(chalk.red(`   - [Line ${cred.line}] Credential: ${cred.value}`));
          });
        }

        if (result.owaspFindings.length > 0) {
          result.owaspFindings.forEach(finding => {
            console.log(chalk.red(`   - [${finding.id}] ${finding.title}: ${finding.detail}`));
          });
        }
        console.log('');
      }
    }

    console.log(chalk.green('\n--- Full Project Audit Complete ---'));

  } catch (error) {
    console.error(chalk.red(`Fatal Error: ${error.message}`));
  }
}

run();
