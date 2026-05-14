import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import open from 'open';
import { exec } from 'child_process';

export class Reporter {
  constructor(targetPath) {
    this.targetPath = targetPath;
    this.startTime = Date.now();
  }

  generateCLISummary(results, totalFiles) {
    const findings = this.getDeduplicatedFindings(results);
    const summary = this.getSummaryStats(findings);
    const table = new Table({
      head: [chalk.cyan('Severity'), chalk.cyan('Count'), chalk.cyan('Status')],
      colWidths: [15, 10, 20]
    });
    table.push(
      [chalk.red('Critical'), summary.critical, summary.critical > 0 ? '❌ Action Required' : '✅ Clear'],
      [chalk.redBright('High'), summary.high, summary.high > 0 ? '⚠️ High Risk' : '✅ Clear'],
      [chalk.yellow('Medium'), summary.medium, summary.medium > 0 ? '🟡 Warning' : '✅ Clear'],
      [chalk.blue('Low'), summary.low, summary.low > 0 ? '🔵 Advisory' : '✅ Clear']
    );
    console.log(chalk.bold('\n📊 Audit Summary:'));
    console.log(table.toString());
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(chalk.white('Scanned ' + totalFiles + ' files in ' + duration + 's.'));
    const score = this.calculateScore(summary);
    this.printVibeScore(score);
  }

  getDeduplicatedFindings(results) {
    const all = [];
    results.forEach(res => {
      const relPath = path.relative(process.cwd(), res.filePath);
      const secrets = res.exposedCredentials || [];
      const owasp = res.owaspFindings || [];
      secrets.forEach(c => all.push({ ...c, file: relPath, category: 'Secret', severity: 'CRITICAL' }));
      owasp.forEach(f => {
        // Simple deduplication: if we have a secret on this line, skip AI 'SEC-SECRETS'
        const isAISecret = f.id === 'SEC-SECRETS' || (f.title && f.title.toLowerCase().includes('secret'));
        if (isAISecret && secrets.some(s => s.line === f.line)) return;
        all.push({ ...f, file: relPath, category: 'Security/Architecture' });
      });
    });
    const seen = new Set();
    return all.filter(f => {
      const key = (f.file + '|' + (f.title || f.type) + '|' + (f.line || '0')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getSummaryStats(findings) {
    const s = { critical: 0, high: 0, medium: 0, low: 0, totalIssues: findings.length };
    findings.forEach(f => {
      const sev = (f.severity || 'MEDIUM').toLowerCase();
      if (s[sev] !== undefined) s[sev]++; else s.medium++;
    });
    return s;
  }

  calculateScore(s) {
    let score = 100;
    score -= (s.critical * 25 + s.high * 10 + s.medium * 5 + s.low * 1);
    return Math.max(0, score);
  }

  printVibeScore(score) {
    let grade = 'F', color = chalk.red;
    if (score >= 90) grade = 'A', color = chalk.green;
    else if (score >= 80) grade = 'B', color = chalk.greenBright;
    else if (score >= 70) grade = 'C', color = chalk.yellow;
    else if (score >= 60) grade = 'D', color = chalk.yellowBright;
    console.log(chalk.bold('✨ Overall Vibe Score: ') + color(score + '/100 [Grade ' + grade + ']'));
  }

  async generateHTMLReport(results) {
    const findings = this.getDeduplicatedFindings(results);
    const summary = this.getSummaryStats(findings);
    const score = this.calculateScore(summary);
    const reportPath = path.resolve(process.cwd(), 'vibe-report.html');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>VibeCheck Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { 
            --bg: #0b0f1a; --sidebar-bg: #111827; --card-bg: #1f2937; --card-hover: #374151; 
            --text-primary: #f9fafb; --text-secondary: #9ca3af; --accent: #6366f1; 
            --critical: #ef4444; --high: #f97316; --medium: #f59e0b; --low: #3b82f6; 
            --safe: #10b981; --border: #374151; 
        } 
        * { box-sizing: border-box; } 
        body { font-family: "Inter", sans-serif; background-color: var(--bg); color: var(--text-primary); margin: 0; display: flex; height: 100vh; overflow: hidden; } 
        aside { width: 260px; background-color: var(--sidebar-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1.5rem; } 
        .logo { font-size: 1.5rem; font-weight: 800; margin-bottom: 2rem; color: var(--accent); display: flex; align-items: center; gap: 0.5rem; } 
        main { flex: 1; overflow-y: auto; padding: 2rem; } 
        .search-bar { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 1rem; color: white; width: 300px; outline: none; margin-bottom: 2rem; } 
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; } 
        .stat-card { background: var(--card-bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border); } 
        .stat-value { font-size: 2rem; font-weight: 800; display: block; margin-top: 0.25rem; } 
        .group-header { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; margin-top: 2rem; } 
        .finding-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 1rem; overflow: hidden; } 
        .finding-card:hover { border-color: var(--accent); } 
        .card-summary { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; } 
        .card-details { padding: 0 1.25rem 1.25rem 1.25rem; display: none; border-top: 1px solid var(--border); background: #111827; } 
        .badge { padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; } 
        .badge-CRITICAL { background: var(--critical); color: white; } 
        .badge-HIGH { background: var(--high); color: white; } 
        .badge-MEDIUM { background: var(--medium); color: white; } 
        .badge-LOW { background: var(--low); color: white; } 
        .vibe-score-container { display: flex; align-items: center; gap: 1.5rem; background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 1.5rem; border-radius: 16px; margin-bottom: 2.5rem; border: 1px solid var(--accent); } 
        .score-circle { width: 80px; height: 80px; border-radius: 50%; border: 6px solid var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; } 
        .label { font-weight: 700; font-size: 0.75rem; color: var(--accent); text-transform: uppercase; margin-bottom: 0.5rem; display: block; margin-top: 1rem; } 
        .fix-container { background: #000; border-radius: 8px; margin-top: 0.5rem; border-left: 3px solid var(--safe); position: relative; }
        .fix-code { padding: 1rem; font-family: monospace; font-size: 0.85rem; color: #10b981; white-space: pre-wrap; overflow-x: auto; margin: 0; } 
        .copy-btn { position: absolute; top: 0.5rem; right: 0.5rem; background: var(--card-hover); border: none; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.7rem; cursor: pointer; opacity: 0.6; }
        .copy-btn:hover { opacity: 1; }
        .empty-state { text-align: center; padding: 4rem; color: var(--text-secondary); }
    </style>
</head>
<body>
    <aside>
        <div class="logo">🛡️ VibeCheck</div>
    </aside>
    <main>
        <header>
            <h1 style="margin:0">Security Audit</h1>
            <p style="color:var(--text-secondary); font-size: 0.9rem;">${this.targetPath}</p>
        </header>
        <div class="vibe-score-container">
            <div class="score-circle">${score}</div>
            <div>
                <h3 style="margin:0">Project Vibe Score</h3>
            </div>
        </div>
        <div class="summary-grid">
            <div class="stat-card stat-critical"><span class="stat-label">Critical</span><span class="stat-value">${summary.critical}</span></div>
            <div class="stat-card stat-high"><span class="stat-label">High</span><span class="stat-value">${summary.high}</span></div>
            <div class="stat-card stat-medium"><span class="stat-label">Medium</span><span class="stat-value">${summary.medium}</span></div>
            <div class="stat-card stat-low"><span class="stat-label">Low</span><span class="stat-value">${summary.low}</span></div>
        </div>
        <input type="text" class="search-bar" placeholder="Search findings..." onkeyup="render()">
        <div id="findings-container"></div>
    </main>
<script>
const findings = ${JSON.stringify(findings)};
function copyFix(id, btn) {
    const code = document.getElementById("code-" + id).innerText;
    navigator.clipboard.writeText(code);
    btn.innerText = "Copied!";
    setTimeout(() => { btn.innerText = "Copy Fix"; }, 2000);
}
function toggleDetails(id) {
    const el = document.getElementById("details-" + id);
    const arrow = document.getElementById("arrow-" + id);
    const show = el.style.display !== "block";
    el.style.display = show ? "block" : "none";
    arrow.innerHTML = show ? "▴" : "▾";
}
function render() {
    const container = document.getElementById("findings-container");
    const search = document.querySelector(".search-bar").value.toLowerCase();
    const filtered = findings.filter(f => 
        (f.file.toLowerCase().includes(search) || (f.title || f.type || "").toLowerCase().includes(search))
    );
    const groups = filtered.reduce((acc, f) => {
        if (!acc[f.file]) acc[f.file] = [];
        acc[f.file].push(f);
        return acc;
    }, {});
    let html = "";
    let idx = 0;
    for (const file in groups) {
        html += "<div class='finding-group'><div class='group-header'>📂 " + file + "</div>" + groups[file].map(f => {
            const fid = "f" + (idx++);
            const remediation = f.remediation || f.fix || "Check code quality guidelines.";
            return \`
                <div class="finding-card">
                    <div class="card-summary" onclick="toggleDetails('\${fid}')">
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <span class="badge badge-\${f.severity}">\${f.severity}</span>
                            <strong>\${f.title || f.type}</strong>
                        </div>
                        <div style="color:var(--text-secondary); font-size:0.8rem;">
                            \${f.line ? "Line " + f.line : ""} <span id="arrow-\${fid}">▾</span>
                        </div>
                    </div>
                    <div class="card-details" id="details-\${fid}">
                        <div><span class="label">Issue Detail</span><p style="margin:0; font-size:0.9rem;">\${f.detail || "N/A"}</p></div>
                        <div><span class="label">Remediation Steps</span><p style="margin:0; font-size:0.9rem;">\${remediation}</p></div>
                        \${f.fixCode ? \`
                            <div>
                                <span class="label">Proposed Fix</span>
                                <div class="fix-container">
                                    <button class="copy-btn" onclick="event.stopPropagation(); copyFix('\${fid}', this)">Copy Fix</button>
                                    <pre class="fix-code" id="code-\${fid}">\${f.fixCode}</pre>
                                </div>
                            </div>
                        \` : ""}
                    </div>
                </div>\`;
        }).join("") + "</div>";
    }
    container.innerHTML = html || "<div class='empty-state'>No findings found. ✨</div>";
}
render();
</script>
</body>
</html>`;

    await fs.writeFile(reportPath, html);
    console.log(chalk.cyan('✨ Interactive Dashboard updated: ') + chalk.underline(reportPath));
    try {
      if (process.platform === 'win32') exec('start "" "' + reportPath + '"');
      else await open(reportPath, { wait: false });
    } catch (e) { console.log(chalk.yellow('   Note: Could not auto-open browser.')); }
  }
}
