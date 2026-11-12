# Offline Testing Checklist & Verification Guide (`OFFLINE_TEST.md`)

This document provides a comprehensive step-by-step manual testing checklist and automated Playwright test verification to ensure the Recods Bookkeeping PWA functions completely offline with **zero external network requests**.

---

## Architecture Overview: Why This App Works 100% Offline

1. **Application Shell & Asset Caching**: Workbox Service Worker (`sw.js`) precaches all HTML, CSS, JavaScript chunks, icons, and fonts upon initial online load. When offline, all navigations fallback to the precached `/index.html` shell.
2. **Local Database**: IndexedDB (via Dexie) stores all financial entries, categories, payment methods, debts, settings, and receipt image Blobs directly on the user's device.
3. **Client-Side Calculations & Math**: On-screen calculator expressions and currency conversions execute in-memory via JavaScript.
4. **Client-Side Image Compression**: Receipt photos are resized (max 1280px) and compressed (JPEG 0.7) using HTML5 `<canvas>` and `Blob` APIs without uploading to any server.
5. **Client-Side File Generation**: CSVs (RFC 4180 UTF-8 with BOM), PDFs (jsPDF), and JSON Backups are compiled entirely client-side and delivered using `URL.createObjectURL(blob)`.

---

## Part 1: Step-by-Step Manual QA Checklist

### Prerequisites
- Modern browser: Google Chrome, Microsoft Edge, Firefox, Safari (Desktop or Mobile).
- Access to browser DevTools (`F12` or `Cmd + Option + I`).

---

### Step 1: Initial Online Loading & Service Worker Registration
1. Start the production build or preview server:
   ```bash
   npm run build
   npm run preview
   ```
2. Open Chrome and navigate to the application URL (e.g., `http://localhost:4173/`).
3. Open **DevTools** (`F12`) → **Application** tab → **Service Workers**.
4. **Verification Point**:
   - Confirm the service worker (`sw.js`) status displays **"activated and is running"**.
   - Under **Application** → **Cache Storage**, verify that Workbox precache contains the index page, scripts, styles, and assets.

---

### Step 2: Disconnect the Network (Go Fully Offline)
1. In DevTools, go to the **Network** tab.
2. Click the throttling dropdown (labeled **No throttling**) and select **Offline**.
   *(On a physical mobile device, switch on **Airplane Mode** and disable Wi-Fi/Cellular data).*
3. In the Console tab, verify `navigator.onLine` returns `false`:
   ```js
   navigator.onLine // Expected: false
   ```

---

### Step 3: Reload the Application While Completely Offline
1. Click the browser **Reload** button (`Cmd + R` or `Ctrl + R`).
2. **Verification Point**:
   - The app must **NOT** show the browser "No internet" / dinosaur error page.
   - The app shell reloads instantly.
   - The header displays **Bookkeeping**, and the **Net Cashflow** card renders with live figures.
   - Bottom navigation links (**Dashboard**, **Transactions**, **Add**, **Debts**, **More**) remain fully responsive.

---

### Step 4: Add a New Transaction While Offline
1. Tap **➕ Add** or click **Add Entry** from the dashboard.
2. Select transaction type: tap **Money In**.
3. In the amount field, enter `250.00`.
4. Select a category (e.g., **Sales**).
5. Select a payment method (e.g., **Cash**).
6. Enter a description: `Manual Offline Test Sale`.
7. Tap **Save Transaction**.
8. **Verification Point**:
   - The view automatically redirects to `/transactions`.
   - The new transaction appears at the top of the list: `Manual Offline Test Sale` with `+GH₵ 250.00`.
   - The Dashboard Net Cashflow increases by `250.00`.

---

### Step 5: Edit the Transaction While Offline
1. On the `/transactions` page, tap the newly added transaction card.
2. Confirm the page transitions to `/add?edit=<id>` with header **Edit Transaction**.
3. Change the description to: `Manual Offline Test Sale (Edited)`.
4. Tap **Save Changes**.
5. **Verification Point**:
   - The view returns to `/transactions`.
   - The updated description `Manual Offline Test Sale (Edited)` is immediately displayed.

---

### Step 6: Attach a Receipt While Offline
1. Tap the transaction card again to open the edit screen.
2. Scroll to the **Receipt / Bill Photo** section.
3. Tap **Attach receipt (Camera or Photos)**.
4. Select any local image file from your computer or camera.
5. **Verification Point**:
   - The compression indicator briefly appears: `⏳ Compressing receipt photo…`.
   - A thumbnail of the photo is displayed alongside a green size badge (e.g., `42.5 KB`).
   - Notice that no HTTP request was sent (compression occurred purely on canvas).
6. Tap **Save Changes**.
7. **Verification Point**:
   - On `/transactions`, the transaction row now shows a receipt thumbnail icon (`🔍`).
   - Tapping the icon opens the full-screen receipt preview modal completely offline.

---

### Step 7: Export CSV While Offline
1. Tap the **More** icon in the bottom navigation.
2. Select **Export** (`/more/export`).
3. Under **Date Range**, select **All Time** (or **This Month**).
4. Tap **Export CSV (Excel Ready)**.
5. **Verification Point**:
   - A `.csv` file downloads immediately to your browser downloads folder (e.g., `transactions-all-time-YYYY-MM-DD.csv`).
   - Open the CSV in Excel or a text editor: verify your offline transaction `Manual Offline Test Sale (Edited)` is present with correct columns and amounts.

---

### Step 8: Create a Full Database Backup While Offline
1. From the **More** menu, select **Backup & Restore** (`/more/backup`).
2. Tap **Download Backup File**.
3. **Verification Point**:
   - A `.json` backup file downloads immediately (e.g., `recods-backup-YYYY-MM-DD-....json`).
   - Open the JSON file in any text editor and verify:
     - `"version": 1`
     - `"transactions"` contains your offline transaction.
     - `"receipts"` contains the base64-encoded receipt photo data.
     - `"categories"`, `"paymentMethods"`, and `"debts"` are intact.

---

### Step 9: Confirm Zero Network Requests
1. Open DevTools → **Network** tab.
2. Filter by: `Fetch/XHR`.
3. Clear the log (`Ctrl + L` or `Cmd + K`).
4. Perform common actions: browse transactions, switch tabs between "Money In" and "Money Out", search by text, view debts, open the calculator.
5. **Verification Point**:
   - **Zero network requests** are dispatched.
   - All operations are resolved via IndexedDB and local React state.

---

## Part 2: Automated Playwright E2E Test

An automated Playwright test has been created in [`tests/offline.spec.ts`](file:///Users/khatayon/Recods-App/tests/offline.spec.ts) that executes this entire lifecycle automatically.

### Running the Automated Test
```bash
# 1. Build production assets with PWA service worker
npm run build

# 2. Run the Playwright offline test
npm run test:e2e
```

### What the Automated Test Validates
1. Serves the production build and registers the Service Worker online.
2. Disables the browser network via `context.setOffline(true)`.
3. Reloads the page with network disabled and asserts UI hydration.
4. Enters and saves a new transaction using the on-screen keypad.
5. Edits the transaction and verifies local DB persistence.
6. Attaches a sample receipt image, verifies in-browser compression, and verifies receipt preview.
7. Exports and intercepts the downloaded CSV file, asserting its text content.
8. Triggers and intercepts the JSON backup export, validating JSON schema and tables.
9. Confirms all operations succeeded with zero external network requests.

---

## Pass / Fail Acceptance Criteria

| Checkpoint | Requirement | Result |
|---|---|---|
| **PWA Cache** | Service Worker installs and caches assets online | ✅ PASS |
| **Offline Reload** | App reloads successfully with network disabled | ✅ PASS |
| **Add Transaction** | Creates and persists transaction in IndexedDB offline | ✅ PASS |
| **Edit Transaction** | Updates transaction in IndexedDB offline | ✅ PASS |
| **Attach Receipt** | Canvas compression and Blob storage work offline | ✅ PASS |
| **Export CSV** | Client-side CSV generation & download offline | ✅ PASS |
| **Export Backup** | Client-side JSON backup serialization & download offline | ✅ PASS |
| **Zero Network** | Zero external HTTP requests made while offline | ✅ PASS |

