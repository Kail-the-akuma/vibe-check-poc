#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';
import cliProgress from 'cli-progress';
import { SecurityAuditor } from './security_vibe.js';
import { ProjectScanner } from './scanner.js';
import { Reporter } from './reporter.js';

dotenv.config();

const target = process.argv[2];

if (!target) {
  console.log(chalk.red('\n❌ Usage: vibe-check <file-or-directory-path>'));
  process.exit(1);
}

const auditor = new SecurityAuditor();
const scanner = new ProjectScanner();
const reporter = new Reporter(target);

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

async function printBanner() {
  console.log(chalk.magenta.bold(`
   _   _ _ _            _____ _               _    
  | | | (_) |          /  __ \\ |             | |   
  | | | |_| |__   ___  | /  \\/ |__   ___  ___| | __
  | | | | | '_ \\ / _ \\ | |   | '_ \\ / _ \\/ __| |/ /
  \\ \\_/ / | |_) |  __/ | \\__/\\ | | |  __/ (__|   < 
   \\___/|_|_.__/ \\___|  \\____/_| |_|\\___|\\___|_|\\_\\
                                                   
  `));
  console.log(chalk.dim('   AI-Powered Security & Architecture Auditor v1.0.0'));
  console.log(chalk.dim('   "Good code, good vibes."\n'));
}

async function run() {
  await printBanner();
  const spinner = ora('Initializing scan...').start();

  try {
    try {
      await fs.access(target);
    } catch {
      spinner.fail(chalk.red(`Path ${target} does not exist.`));
      process.exit(1);
    }

    const stat = await fs.stat(target);
    let filesToScan = [];

    if (stat.isDirectory()) {
      filesToScan = await scanner.scan(target);
    } else {
      filesToScan = [path.resolve(target)];
    }

    const totalFiles = filesToScan.length;
    spinner.succeed(chalk.blue(`Found ${totalFiles} files to analyze.`));

    // Progress Bar
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('Analyzing {bar}') + ' | {percentage}% | {value}/{total} Files | {file}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(totalFiles, 0, { file: 'Starting...' });

    const allResults = [];
    const batchSize = 5;

    for (let i = 0; i < filesToScan.length; i += batchSize) {
      const batch = filesToScan.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (file) => {
        const res = await runAudit(file);
        progressBar.increment(1, { file: path.basename(file) });
        return res;
      }));
      allResults.push(...results);
    }

    progressBar.stop();

    // Generate Reports
    reporter.generateCLISummary(allResults, totalFiles);
    await reporter.generateHTMLReport(allResults);

    console.log(chalk.green('\n✅ Audit Complete. Check the report for details.\n'));

  } catch (error) {
    if (spinner.isSpinning) spinner.stop();
    console.error(chalk.red(`\nFatal Error: ${error.message}`));
  }
}

run();
