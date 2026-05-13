#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { SecurityAuditor } from './security_vibe.js';

const target = process.argv[2];

if (!target) {
  console.log(chalk.red('Usage: vibe-check <file-path>'));
  process.exit(1);
}

const auditor = new SecurityAuditor();

async function run() {
  try {
    if (!fs.existsSync(target)) {
      console.log(chalk.red(`Error: File ${target} does not exist.`));
      process.exit(1);
    }

    const content = fs.readFileSync(target, 'utf-8');
    const ext = path.extname(target);

    console.log(chalk.blue(`\n🔍 Scoping out the security vibe for: ${target}...\n`));

    const results = await auditor.analyze(content, ext);

    if (results.overallVibe === 'SAFE') {
      console.log(chalk.green('✅ Vibe is clean! No obvious injections or exposed secrets found.'));
    } else {
      console.log(chalk.yellow(`⚠️  Vibe is ${chalk.bold(results.overallVibe)}!\n`));

      if (results.exposedCredentials.length > 0) {
        console.log(chalk.red.underline('Exposed Credentials Found:'));
        results.exposedCredentials.forEach(cred => {
          console.log(chalk.red(`- [Line ${cred.line}] ${cred.type}: ${cred.value}`));
        });
        console.log('');
      }

      if (results.owaspFindings.length > 0) {
        console.log(chalk.red.underline('OWASP Top 10 Findings:'));
        results.owaspFindings.forEach(finding => {
          console.log(chalk.red(`- [${finding.id}] ${finding.title}: ${finding.detail} (${finding.severity})`));
        });
        console.log('');
      }
    }

    console.log(chalk.gray('--- Audit Complete ---'));

  } catch (error) {
    console.error(chalk.red(`Fatal Error: ${error.message}`));
  }
}

run();
