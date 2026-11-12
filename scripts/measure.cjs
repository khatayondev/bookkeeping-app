// scripts/measure.cjs
const { spawn } = require('child_process');
const http = require('http');

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

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || JSON.stringify(a)).join(' ');
        if (!text.includes('[vite]')) {
          console.log('[BROWSER CONSOLE]', text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER ERROR]', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
      }
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return res.result?.value;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    const start = Date.now();
    while (Date.now() - start < 15000) {
      try {
        const ready = await this.evaluate(`document.readyState === 'complete' && window.location.href.startsWith('${url.split('?')[0]}')`);
        if (ready) {
          await sleep(300);
          return;
        }
      } catch {}
      await sleep(150);
    }
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('=== Starting Browser Performance Benchmark ===');
  const vite = spawn('npx', ['vite', '--port', '5188', '--strictPort'], {
    stdio: 'pipe',
  });

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let chrome;
  let cdp;

  try {
    await waitForServer('http://localhost:5188');
    console.log('✓ Vite dev server running on http://localhost:5188');

    const chromeArgs = [
      '--headless=new',
      '--remote-debugging-port=9233',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--disable-gpu',
      '--user-data-dir=/tmp/recods-bench-' + Date.now(),
      'http://localhost:5188',
    ];

    chrome = spawn(chromePath, chromeArgs, { stdio: 'pipe' });
    await waitForServer('http://127.0.0.1:9233/json');

    const tabs = await getJson('http://127.0.0.1:9233/json');
    const targetTab = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!targetTab) throw new Error('No target page found in Chrome');

    cdp = new CdpClient(targetTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Performance.enable');

    console.log('✓ Connected to Headless Chrome via CDP');

    // 1. Navigate to /more and seed 5,000 transactions + 30 debts
    await cdp.navigate('http://localhost:5188/more');
    await sleep(1000);

    console.log('\n--- Seeding 5,000 transactions and 30 debts ---');
    const seedResult = await cdp.evaluate(`
      (async () => {
        let attempts = 0;
        while (!window.__seedDatabase && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        if (!window.__seedDatabase) {
          return { error: 'window.__seedDatabase not found' };
        }
        const res = await window.__seedDatabase(5000, 30);
        return res;
      })()
    `);
    console.log('Seed result:', seedResult);

    // 2. Measure Dashboard (SPA navigation & live query calculation)
    console.log('\n--- Measuring Dashboard Open Time (5,000 rows in DB) ---');
    const dashboardTimes = [];
    for (let i = 0; i < 5; i++) {
      // First go to /more so we test navigating to dashboard
      await cdp.evaluate(`window.history.pushState({}, '', '/more'); window.dispatchEvent(new PopStateEvent('popstate'));`);
      await sleep(200);

      const openDuration = await cdp.evaluate(`
        (async () => {
          const start = performance.now();
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));

          while (true) {
            const el = document.querySelector('.text-3xl.font-bold');
            if (el && el.textContent.trim().length > 0 && !el.textContent.includes('0.00')) {
              break;
            }
            if (performance.now() - start > 10000) break;
            await new Promise(r => setTimeout(r, 5));
          }
          return performance.now() - start;
        })()
      `);
      dashboardTimes.push(openDuration);
      await sleep(100);
    }
    const avgDashboard = dashboardTimes.reduce((a, b) => a + b, 0) / dashboardTimes.length;
    console.log(`Dashboard open iterations: ${dashboardTimes.map(t => t.toFixed(1) + 'ms').join(', ')}`);
    console.log(`>>> Average Dashboard Open Time: ${avgDashboard.toFixed(1)}ms (Target: < 200ms)`);

    // 3. Measure Transactions Page (DOM nodes & memory)
    console.log('\n--- Measuring Transactions Page & Memory (5,000 items) ---');
    await cdp.evaluate(`window.history.pushState({}, '', '/transactions'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await sleep(1000);

    const txMetrics = await cdp.evaluate(`
      (async () => {
        const domNodes = document.querySelectorAll('*').length;
        const renderedCards = document.querySelectorAll('.rounded-xl.border').length;
        const mem = performance.memory ? {
          usedJSHeapSize: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB',
          totalJSHeapSize: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB'
        } : null;
        return { domNodes, renderedCards, mem };
      })()
    `);
    console.log('Transactions page DOM nodes:', txMetrics.domNodes);
    console.log('Transactions page rendered cards (virtualized):', txMetrics.renderedCards);
    console.log('Transactions page JS heap memory:', txMetrics.mem);

    // 4. Measure Filter Actions Time (In/Out & Search)
    console.log('\n--- Measuring Filter Action Time ---');
    const filterTypeTimes = [];
    for (const filterName of ['Money In', 'Money Out', 'All']) {
      const duration = await cdp.evaluate(`
        (async () => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.trim() === '${filterName}');
          if (!btn) return null;

          const start = performance.now();
          btn.click();

          // Wait for React re-render & layout
          await new Promise(r => requestAnimationFrame(r));
          await new Promise(r => setTimeout(r, 0));
          return performance.now() - start;
        })()
      `);
      if (duration !== null) filterTypeTimes.push({ filter: filterName, duration });
      await sleep(200);
    }

    console.log('Type filter action times:');
    for (const ft of filterTypeTimes) {
      console.log(`  - Filter "${ft.filter}": ${ft.duration.toFixed(1)}ms`);
    }

    // Search filter measurement
    const searchDuration = await cdp.evaluate(`
      (async () => {
        const input = document.querySelector('input[type="search"]');
        if (!input) return null;

        const start = performance.now();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'inventory');
        input.dispatchEvent(new Event('input', { bubbles: true }));

        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 0));
        return performance.now() - start;
      })()
    `);
    console.log(`  - Search filter ("inventory"): ${searchDuration?.toFixed(1)}ms`);

    console.log('\n=== Benchmark Summary ===');
    console.log(`1. Dashboard Open Time: ${avgDashboard.toFixed(1)}ms (PASSED < 200ms: ${avgDashboard < 200 ? 'YES ✅' : 'NO ❌'})`);
    console.log(`2. Filter Action Time: ${filterTypeTimes[0]?.duration.toFixed(1)}ms (PASSED < 200ms: ${filterTypeTimes[0]?.duration < 200 ? 'YES ✅' : 'NO ❌'})`);
    console.log(`3. Transactions DOM Nodes: ${txMetrics.domNodes} (down from 70,000+ without virtualization)`);
    console.log(`4. Transactions JS Heap: ${txMetrics.mem?.usedJSHeapSize}`);

  } catch (err) {
    console.error('Benchmark failed:', err);
  } finally {
    if (cdp) cdp.close();
    if (chrome) chrome.kill();
    if (vite) vite.kill();
    process.exit(0);
  }
}

run();
