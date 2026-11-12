// scripts/audit-lighthouse.cjs
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on('error', reject);
      });
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function runAudit() {
  console.log('--- Starting preview server on port 4188 ---');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4188', '--strictPort'], {
    stdio: 'pipe',
  });

  try {
    await waitForServer('http://localhost:4188');
    console.log('Preview server ready at http://localhost:4188');

    const urls = [
      'http://localhost:4188/',
      'http://localhost:4188/transactions',
      'http://localhost:4188/add',
      'http://localhost:4188/debts',
      'http://localhost:4188/more',
      'http://localhost:4188/calculator',
      'http://localhost:4188/export',
      'http://localhost:4188/backup',
      'http://localhost:4188/storage',
      'http://localhost:4188/security',
    ];

    const results = [];

    for (const url of urls) {
      const pageName = new URL(url).pathname || '/';
      console.log(`\nAuditing ${pageName}...`);
      const reportFile = `/tmp/lh-report-${pageName.replace(/[^a-z0-9]/gi, '_')}.json`;
      
      try {
        execSync(
          `npx lighthouse "${url}" --only-categories=accessibility --output=json --output-path="${reportFile}" --chrome-flags="--headless=new --no-sandbox" --quiet`,
          { stdio: 'pipe' }
        );

        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        const score = Math.round((report.categories.accessibility.score || 0) * 100);
        
        const failedAudits = Object.values(report.audits)
          .filter((a) => a.score !== null && a.score < 1)
          .map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            items: a.details?.items?.map((item) => item.node?.snippet || item.node?.selector || item),
          }));

        results.push({ page: pageName, score, failedAudits });
        console.log(`Score for ${pageName}: ${score}/100`);
        if (failedAudits.length > 0) {
          console.log(`  Failed audits (${failedAudits.length}):`);
          failedAudits.forEach((f) => {
            console.log(`    - [${f.id}] ${f.title}`);
            if (f.items?.length) {
              f.items.slice(0, 3).forEach((item) => console.log(`      Snippet: ${JSON.stringify(item)}`));
            }
          });
        }
      } catch (err) {
        console.error(`Audit failed for ${pageName}:`, err.message);
      }
    }

    console.log('\n=======================================');
    console.log('       LIGHTHOUSE AUDIT SUMMARY        ');
    console.log('=======================================');
    results.forEach((r) => {
      console.log(`${r.page.padEnd(20)}: ${r.score}/100 ${r.score >= 95 ? '✅' : '❌'}`);
    });

  } finally {
    preview.kill();
  }
}

runAudit();

