# Attio CRM Data Extractor

A Chrome Extension that extracts Contacts, Deals, and Tasks from [Attio CRM](https://attio.com), stores them locally, and displays them in a beautiful popup dashboard.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)

## Features

- ✨ **Extract Data** - Automatically extracts Contacts, Deals, and Tasks from Attio's list views
- 💾 **Local Storage** - All data stored locally with deduplication and sync
- 🔍 **Search & Filter** - Powerful search across all extracted data
- 🗑️ **Delete Records** - Remove individual records with confirmation
- 📊 **Export Data** - Export as JSON or CSV files
- 🎨 **Beautiful UI** - Dark theme with glassmorphism effects
- 🔄 **Real-time Sync** - Cross-tab synchronization via storage events
- 🎯 **Visual Feedback** - Shadow DOM indicator shows extraction progress

## Installation

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Dnyanesh182/attio-crm-extractor.git
cd attio-crm-extractor

# Install dependencies
npm install

# Build for development (watch mode)
npm run dev

# Build for production
npm run build
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist` folder from the project directory
5. The extension icon should now appear in your toolbar

## Usage

1. Navigate to [Attio CRM](https://app.attio.com)
2. Open a list view (People, Deals, or Tasks)
3. Click the extension icon in Chrome toolbar
4. Click **"Extract Now"** button
5. Watch the extraction progress indicator on the page
6. View your extracted data in the popup dashboard

## DOM Selection Strategy

### Approach: CSS Selectors with Fallback Heuristics

We use a multi-layered approach to handle Attio's dynamic DOM structure:

| Layer | Method | Description |
|-------|--------|-------------|
| 1️⃣ | **URL Detection** | Identify view type from URL patterns (`/people`, `/deals`, `/tasks`) |
| 2️⃣ | **CSS Selectors** | Target table rows with semantic selectors (`[role="row"]`, `tbody tr`) |
| 3️⃣ | **Pattern Matching** | Regex patterns for emails, phones, currency values |
| 4️⃣ | **DOM Landmarks** | Fallback to page titles and navigation states |

### View Detection

```javascript
// Primary: URL-based detection
if (pathname.includes('/people')) return 'people';
if (pathname.includes('/deals')) return 'deals';
if (pathname.includes('/tasks')) return 'tasks';

// Fallback: DOM-based detection
const pageTitle = document.querySelector('h1')?.textContent;
```

### Data Extraction

```javascript
// Table rows extraction
const rows = document.querySelectorAll('[role="row"], tbody tr');

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Currency pattern
const CURRENCY_PATTERN = /[$€£¥₹]\s*[\d,]+(?:\.\d{1,2})?/gi;
```

### Dynamic Content Handling

```javascript
// MutationObserver for lazy-loaded content
const observer = new MutationObserver((mutations) => {
  // Re-scan when new content loads
});
observer.observe(document.body, { childList: true, subtree: true });

// Stability check - wait for content to stop changing
async function extractWithWait(maxWait = 3000) {
  // Poll until row count stabilizes
}
```

## Storage Schema

All data is stored in `chrome.storage.local` under the key `attio_data`:

```typescript
interface AttioData {
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  lastSync: number;      // Unix timestamp
  syncLock?: number;     // Mutex for race conditions
}

interface Contact {
  id: string;            // Hash of name + email
  name: string;
  emails: string[];
  phones: string[];
  extractedAt: number;
  updatedAt: number;
}

interface Deal {
  id: string;            // Hash of name + company
  name: string;
  value: number | null;
  stage: string;
  company: string;
  extractedAt: number;
  updatedAt: number;
}

interface Task {
  id: string;            // Hash of title + dueDate
  title: string;
  dueDate: string | null;
  assignee: string;
  done: boolean;
  extractedAt: number;
  updatedAt: number;
}
```

### Deduplication Strategy

- **ID Generation**: Hash-based ID from key fields (name, email, etc.)
- **Merge on Conflict**: Update existing records, preserve `extractedAt`
- **Atomic Updates**: Read-modify-write with retry logic

### Race Condition Handling

```typescript
async function acquireLock(): Promise<boolean> {
  const { syncLock } = await chrome.storage.local.get('syncLock');
  if (syncLock && Date.now() - syncLock < 5000) return false;
  await chrome.storage.local.set({ syncLock: Date.now() });
  return true;
}
```

## Project Structure

```
attio-crm-extractor/
├── manifest.json              # Chrome Extension Manifest V3
├── package.json               # Dependencies
├── vite.config.ts             # Build configuration
├── tailwind.config.js         # TailwindCSS config
│
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background service worker
│   │
│   ├── content/
│   │   ├── index.ts           # Content script entry
│   │   ├── detector.ts        # View detection
│   │   ├── indicator.ts       # Shadow DOM feedback
│   │   └── extractors/
│   │       ├── contacts.ts    # Contacts extraction
│   │       ├── deals.ts       # Deals extraction
│   │       └── tasks.ts       # Tasks extraction
│   │
│   ├── popup/
│   │   ├── index.html         # Popup entry
│   │   ├── main.tsx           # React entry
│   │   ├── App.tsx            # Main component
│   │   ├── index.css          # TailwindCSS styles
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── Tabs.tsx
│   │       ├── SearchBar.tsx
│   │       ├── ContactsList.tsx
│   │       ├── DealsList.tsx
│   │       ├── TasksList.tsx
│   │       └── ExportButtons.tsx
│   │
│   └── shared/
│       ├── types.ts           # TypeScript interfaces
│       └── storage.ts         # Storage operations
│
└── dist/                      # Build output
```

## Technology Stack

- **Chrome Extension**: Manifest V3 with service worker
- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS 3.4
- **Build**: Vite 5
- **APIs**: chrome.storage, chrome.tabs, chrome.runtime

**What's covered:**
1. Installing the extension
2. Extracting data from live Attio (Contacts, Deals, Tasks)
3. Viewing data in popup dashboard
4. Search and filter functionality
5. Deleting individual records
6. Data persistence after page refresh
7. Exporting data as JSON/CSV

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request
