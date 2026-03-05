# JobRoom Chrome Extension

Quickly save job applications to your JobRoom tracker directly from any job posting page.

## Features

- 🔍 **Auto-Extract** - Automatically extracts company, position, location, and salary from job pages
- 💾 **Quick Save** - Save applications with one click
- 📋 **Pre-filled Form** - Smart extraction from LinkedIn, Indeed, Glassdoor, and more
- 🔗 **Direct Integration** - Saves directly to your JobRoom account

## Installation

### Development Mode

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder from this project
5. The extension icon should appear in your toolbar

### Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "JobRoom" and click the pin icon
3. Now you can access it anytime from the toolbar

## Usage

1. **Navigate to any job posting** (LinkedIn, Indeed, company career pages, etc.)
2. **Click the JobRoom extension icon** in your toolbar
3. **Click "Auto-Extract"** to automatically fill the form
4. **Review/Edit** the extracted information
5. **Click "Save to JobRoom"** to save to your account

### First Time Setup

Before using the extension, you need to:
1. Make sure the JobRoom backend is running (`localhost:8000`)
2. Login to JobRoom at `localhost:3000`
3. The extension will automatically use your saved session

## Supported Job Boards

The extension works with most job boards and can extract data from:
- LinkedIn Jobs
- Indeed
- Glassdoor
- Company career pages (Greenhouse, Lever, Workday, etc.)
- Google Jobs
- And many more!

## Data Extraction

The extension intelligently extracts:
- **Company Name** - From meta tags, page content, or URL
- **Position Title** - From page title and content
- **Location** - Remote, hybrid, or office location
- **Salary Range** - When posted on the page
- **Job URL** - Current page URL
- **Notes** - Auto-generated with source and date

## Troubleshooting

### "Please login at localhost:3000 first"
- Make sure you're logged into JobRoom in your browser
- The backend must be running on port 8000

### "Could not extract data"
- Try refreshing the job page
- Some pages may require manual entry
- Check the browser console for errors

### Extension not appearing
- Make sure Developer mode is enabled in chrome://extensions/
- Try reloading the extension

## Privacy

This extension:
- Only accesses the active tab when you click the extension
- Stores your auth token locally (never sent to third parties)
- Does not track or collect any browsing data

## Development

To modify the extension:
1. Edit the files in this folder
2. Click the refresh icon on the extension in chrome://extensions/
3. Test the changes

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.css` - Popup styles
- `popup.js` - Popup logic and API calls
- `content.js` - Page scraping and data extraction
- `icons/` - Extension icons
