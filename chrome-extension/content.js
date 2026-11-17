// Content script for extracting job data from job posting pages
// Optimized for major job boards with robust fallback selectors

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    try {
      const data = extractJobData();
      sendResponse({ data });
    } catch (error) {
      console.error('Extraction error:', error);
      sendResponse({ data: null });
    }
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getToken') {
    const token = localStorage.getItem('jobroom_token') || localStorage.getItem('token');
    sendResponse({ token });
    return true;
  }
});

function extractJobData() {
  const hostname = window.location.hostname.toLowerCase();
  
  // Route to specific extractor based on domain
  if (hostname.includes('linkedin')) {
    return extractLinkedIn();
  } else if (hostname.includes('indeed')) {
    return extractIndeed();
  } else if (hostname.includes('glassdoor')) {
    return extractGlassdoor();
  } else if (hostname.includes('google.com') && (hostname.includes('jobs') || document.title.includes('Jobs'))) {
    return extractGoogleJobs();
  } else if (hostname.includes('greenhouse')) {
    return extractGreenhouse();
  } else if (hostname.includes('lever')) {
    return extractLever();
  } else if (hostname.includes('workday')) {
    return extractWorkday();
  } else if (hostname.includes('ziprecruiter')) {
    return extractZipRecruiter();
  } else if (hostname.includes('monster')) {
    return extractMonster();
  } else if (hostname.includes('careerbuilder')) {
    return extractCareerBuilder();
  } else if (hostname.includes('simplyhired')) {
    return extractSimplyHired();
  } else if (hostname.includes('dice')) {
    return extractDice();
  } else if (hostname.includes('angel.co') || hostname.includes('wellfound')) {
    return extractAngelList();
  } else {
    return extractGeneric();
  }
}

// LinkedIn Jobs - Updated selectors for 2024 layouts
function extractLinkedIn() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  // Position title - multiple selectors for different LinkedIn layouts
  const positionSelectors = [
    'h1.t-24.job-title',
    'h1.top-card-layout__title',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-test="job-title"]',
    '.job-title',
    'h1[class*="job-title"]',
    'title'
  ];
  data.position = getText(positionSelectors).replace(/\s*-\s*LinkedIn.*$/i, '').replace(/\s*\|.*$/i, '').trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  // Company name
  const companySelectors = [
    '[data-test="company-name"] a',
    '.top-card-layout__card .sub-title-1 a',
    '[data-company-name]',
    '.company-name',
    '[data-test="company-info"] a',
    '.jobsearch-InlineCompanyRating a',
    'a[href*="/company/"]',
    '.topcard__org-name-link'
  ];
  data.company = getText(companySelectors).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  // Location
  const locationSelectors = [
    '[data-test="job-location"]',
    '.job-location',
    '[data-test="location-text"]',
    '.top-card-layout__bullet-item',
    '.jobsearch-JobInfoHeader-subtitle div',
    '.job-location span',
    '[class*="location"]'
  ];
  data.location = getText(locationSelectors).replace(/^(?:Based in|Location:)\s*/i, '').trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  // Salary from page text
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  // Try to get salary from specific elements
  const salarySelectors = [
    '[data-test="salary"]',
    '.salary',
    '.compensation',
    '[class*="salary"]'
  ];
  const salaryEl = getElement(salarySelectors);
  if (salaryEl && salaryEl.innerText.trim()) {
    data.salary = salaryEl.innerText.trim();
    confidence += 5;
  }
  
  data.notes = `Source: LinkedIn | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Indeed - Updated selectors
function extractIndeed() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    '#jobTitle',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-tn-element="jobTitle"]',
    'h1[class*="jobTitle"]',
    'title'
  ]).replace(/\s*-\s*Indeed.*$/i, '').trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText([
    '[data-company-name="true"]',
    '.companyName',
    '[data-tn-element="company-name"]',
    '.jobsearch-InlineCompanyRating',
    '[data-tn-element="secondaryContainer"]',
    'a[href*="/cmp/"]',
    '.company-name'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText([
    '[data-testid="text-location"]',
    '.jobsearch-JobInfoHeader-subtitle',
    '[data-tn-element="location"]',
    '.location',
    '[class*="location"]'
  ]).replace(/^(?:from|in)\s+/i, '').trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  // Salary
  const salaryEl = document.querySelector('[data-testid="attribute_snippet_test-container"]');
  data.salary = salaryEl ? salaryEl.innerText.trim() : extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  // Try additional salary selectors
  if (!data.salary) {
    const salarySelectors = [
      '[data-testid="salary"]',
      '.salary-snippet',
      '.jobsearch-SalaryInfo',
      '[class*="salary"]'
    ];
    const el = getElement(salarySelectors);
    if (el) data.salary = el.innerText.trim();
  }
  
  data.notes = `Source: Indeed | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Glassdoor - Updated selectors
function extractGlassdoor() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    '.jobTitle',
    '[data-test="job-title"]',
    'h1.job-title',
    'h1[class*="JobTitle"]',
    'title'
  ]).replace(/\s*\|.*$/i, '').trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText([
    '.employer-name',
    '[data-test="employer-name"]',
    '.jobDetails .company',
    '.header .company',
    '.header__employerName',
    'a[href*="/Reviews/"]',
    '.company-name'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText([
    '.location',
    '[data-test="location"]',
    '.job-location',
    '.jobDetails .location',
    '[class*="location"]'
  ]).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  // Salary
  const salaryEl = document.querySelector('.salary-estimate, [data-test="salary"], .job-salary, .salary-text, [class*="salary"]');
  data.salary = salaryEl ? salaryEl.innerText.trim() : extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: Glassdoor | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Google Jobs
function extractGoogleJobs() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    'h2[data-md="title"]',
    '.job-title',
    'div[role="heading"]',
    'h1[class*="title"]',
    'title'
  ]).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  // Try structured data first
  const structuredData = document.querySelector('script[type="application/ld+json"]');
  if (structuredData) {
    try {
      const json = JSON.parse(structuredData.innerText);
      if (json.hiringOrganization) {
        data.company = typeof json.hiringOrganization === 'string' ? 
          json.hiringOrganization : (json.hiringOrganization.name || '');
        if (data.company) confidence += 25;
      }
      if (json.jobLocation) {
        const location = json.jobLocation;
        data.location = location.address || location.name || location;
        if (data.location) confidence += 20;
      }
      if (json.baseSalary) {
        data.salary = formatSalary(json.baseSalary);
        if (data.salary) confidence += 10;
      }
    } catch (e) {}
  }
  
  if (!data.company) {
    data.company = getText(['.company-name', '[data-tn-element="company-name"]', '.employer-name']).trim().substring(0, 100);
    if (data.company) confidence += 15;
  }
  
  if (!data.location) {
    data.location = getText(['.location', '.job-location', '[class*="location"]']).trim().substring(0, 100);
    if (data.location) confidence += 10;
  }
  
  if (!data.salary) {
    data.salary = extractSalary(document.body.innerText);
    if (data.salary) confidence += 5;
  }
  
  data.notes = `Source: Google Jobs | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Greenhouse
function extractGreenhouse() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.company = getText([
    '.company-name',
    'header h1',
    '.header-branding h1',
    'meta[name="application:company"]',
    '.header h2',
    '[class*="company"]'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 30;
  
  data.position = getText([
    '#app-title',
    'h1.app-title',
    '.job-title',
    'h1[class*="title"]',
    'title'
  ]).replace(/\s*-\s*Greenhouse.*$/i, '').trim().substring(0, 150);
  if (data.position) confidence += 25;
  
  data.location = getText([
    '#location',
    '.location',
    '.job-location',
    'meta[name="application:location"]',
    '.location span',
    '[class*="location"]'
  ]).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: Greenhouse | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Lever
function extractLever() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  // Company from URL
  const urlParts = window.location.pathname.split('/');
  const companyIndex = urlParts.indexOf('jobs');
  data.company = companyIndex > 0 ? urlParts[companyIndex - 1] : '';
  
  if (!data.company) {
    data.company = getText(['.company-name', 'header h1', '.branding', '[class*="company"]']).trim().substring(0, 100);
  }
  if (data.company) confidence += 30;
  
  data.position = document.querySelector('.app-title')?.innerText?.trim().substring(0, 150) ||
                  getText(['h1', 'h1[class*="title"]', 'title']).trim().substring(0, 150);
  if (data.position) confidence += 25;
  
  // Location from table
  const rows = document.querySelectorAll('table tr, .section-row, [class*="location"]');
  for (const row of rows) {
    const text = row.innerText.toLowerCase();
    if (text.includes('location')) {
      const cells = row.querySelectorAll('td, div, span');
      if (cells.length > 1) {
        data.location = cells[cells.length - 1].innerText.trim().substring(0, 100);
        break;
      }
    }
  }
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: Lever | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Workday
function extractWorkday() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    '[data-automation-id="jobTitle"]',
    '.job-title',
    'h1',
    'title',
    '[data-automation-id="postTitle"]',
    'h1[class*="title"]'
  ]).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText([
    '[data-automation-id="company"]',
    '.company-name',
    'header .company',
    '[data-automation-id="organization"]',
    '[class*="company"]'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText([
    '[data-automation-id="location"]',
    '.job-location',
    '.location',
    '[data-automation-id="primaryLocation"]',
    '[class*="location"]'
  ]).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: Workday | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// ZipRecruiter
function extractZipRecruiter() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    '.job-title',
    'h1.job_title',
    '[data-test="job-title"]',
    'title',
    '.job-description h1',
    'h1[class*="title"]'
  ]).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText([
    '.job-company',
    '.company_name',
    '[data-test="company-name"]',
    '.employer',
    'a[href*="/company/"]',
    '[class*="company"]'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText([
    '.job-location',
    '.location',
    '.job_city_state',
    '.job-location span',
    '[class*="location"]'
  ]).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = getText([
    '.job-salary',
    '.salary',
    '[data-test="salary"]',
    '.salary-range',
    '[class*="salary"]'
  ]).trim() || extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: ZipRecruiter | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Monster
function extractMonster() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    '.job-title',
    'h1.job-title',
    'title',
    '[data-automation-id="jobTitle"]',
    'h1[class*="title"]'
  ]).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText([
    '.company-name',
    '.job-company',
    '[data-automation-id="companyName"]',
    '.employer-name',
    'a[href*="/company/"]',
    '[class*="company"]'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText([
    '.job-location',
    '.job-city-state',
    '.location',
    '[data-automation-id="jobLocation"]',
    '[class*="location"]'
  ]).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: Monster | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// CareerBuilder
function extractCareerBuilder() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText([
    '.job-title',
    'h1.job-title',
    'title',
    '[data-test="job-title"]',
    'h1[class*="title"]'
  ]).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText([
    '.company-name',
    '.job-company',
    '[data-test="company-name"]',
    '.employer',
    'a[href*="/company/"]',
    '[class*="company"]'
  ]).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText([
    '.job-location',
    '.location',
    '.job-location span',
    '[class*="location"]'
  ]).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: CareerBuilder | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// SimplyHired
function extractSimplyHired() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText(['.job-title', 'h1', 'title', 'h1[class*="title"]']).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText(['.company', '.employer-name', '[class*="company"]']).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText(['.location', '.job-location', '[class*="location"]']).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10;
  
  data.notes = `Source: SimplyHired | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Dice
function extractDice() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText(['[data-automation-id="jobTitle"]', '.job-title', 'h1', 'title', 'h1[class*="title"]']).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText(['[data-automation-id="companyName"]', '.company', '.employer', '[class*="company"]']).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText(['[data-automation-id="jobLocation"]', '.location', '.job-location', '[class*="location"]']).trim().substring(0, 100);
  if (data.location) confidence += 20;
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10.
  
  data.notes = `Source: Dice | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// AngelList / Wellfound
function extractAngelList() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  data.position = getText(['.job-title', 'h1', 'title', '[class*="JobTitle"]', 'h1[class*="title"]']).trim().substring(0, 150);
  if (data.position) confidence += 30;
  
  data.company = getText(['.company-name', '.company', '[class*="Company"]', '[class*="company"]']).trim().substring(0, 100);
  if (data.company) confidence += 25;
  
  data.location = getText(['.location', '.job-location', '[class*="Location"]', '[class*="location"]']).trim().substring(0, 100);
  if (data.location) confidence += 20.
  
  data.salary = extractSalary(document.body.innerText);
  if (data.salary) confidence += 10.
  
  data.notes = `Source: Wellfound | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Generic extractor for unknown sites - Improved with better fallbacks
function extractGeneric() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '', confidence: 0 };
  let confidence = 0;
  
  const title = document.title;
  const bodyText = document.body.innerText;
  
  // Meta tags
  data.company = getMeta('og:site_name') || 
                 getMeta('application:company') ||
                 extractCompanyFromText(bodyText);
  if (data.company) confidence += 20;
  
  data.position = getMeta('og:title')?.replace(`${data.company} -`, '') ||
                  getMeta('application:job-title') ||
                  extractPositionFromTitle(title, bodyText);
  if (data.position) confidence += 25;
  
  data.location = getMeta('application:location') ||
                  extractLocationFromText(bodyText);
  if (data.location) confidence += 15;
  
  data.salary = extractSalary(bodyText);
  if (data.salary) confidence += 10;
  
  // Extract from URL
  if (!data.company || data.company.length < 2) {
    const hostParts = window.location.hostname.replace('www.', '').split('.');
    data.company = capitalizeWords(hostParts[0]).replace(/careers|jobs|job|apply/i, '').substring(0, 100);
    if (data.company) confidence += 10;
  }
  
  // Try to find structured data
  const structuredData = document.querySelector('script[type="application/ld+json"]');
  if (structuredData) {
    try {
      const json = JSON.parse(structuredData.innerText);
      if (json['@type'] === 'JobPosting') {
        if (!data.position && json.title) {
          data.position = json.title.substring(0, 150);
          confidence += 15;
        }
        if (!data.company && json.hiringOrganization) {
          data.company = typeof json.hiringOrganization === 'string' ? 
            json.hiringOrganization : (json.hiringOrganization.name || '');
          confidence += 15;
        }
        if (!data.location && json.jobLocation) {
          const location = json.jobLocation;
          data.location = location.address || location.name || location;
          confidence += 10;
        }
        if (!data.salary && json.baseSalary) {
          data.salary = formatSalary(json.baseSalary);
          confidence += 10;
        }
      }
    } catch (e) {}
  }
  
  // Try common selectors as last resort
  if (!data.position) {
    data.position = getText(['h1', '[class*="title"]', '[class*="position"]', '[class*="job"]']).trim().substring(0, 150);
  }
  if (!data.company) {
    data.company = getText(['[class*="company"]', '[class*="employer"]', '[class*="organization"]']).trim().substring(0, 100);
  }
  if (!data.location) {
    data.location = getText(['[class*="location"]', '[class*="address"]', '[class*="city"]']).trim().substring(0, 100);
  }
  
  data.notes = `Source: ${window.location.hostname} | Saved: ${new Date().toLocaleDateString()}`;
  data.confidence = Math.min(confidence, 100);
  
  return data;
}

// Helper functions
function getText(selectors) {
  if (typeof selectors === 'string') selectors = [selectors];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText?.trim()) {
      return el.innerText.trim();
    }
  }
  return '';
}

function getElement(selectors) {
  if (typeof selectors === 'string') selectors = [selectors];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

function getMeta(property) {
  const meta = document.querySelector(`meta[property="${property}"]`) ||
               document.querySelector(`meta[name="${property}"]`);
  return meta?.getAttribute('content') || '';
}

function extractCompanyFromText(text) {
  const patterns = [
    /(?:apply|work|join)\s+(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)/i,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:is hiring|is looking|careers)/i,
    /(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:we're|we are)/i,
    /company[:\s]+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().substring(0, 100);
  }
  return '';
}

function extractPositionFromTitle(title, bodyText) {
  let position = title
    .replace(/\s*-\s*(?:LinkedIn|Indeed|Glassdoor|Google|Jobs|Careers).*$/i, '')
    .replace(/\s*\|.*$/i, '')
    .replace(/^(?:Job:|Position:|Hiring:)\s*/i, '')
    .trim();
  
  if (position.length > 150 || position.length < 3) {
    const match = bodyText.match(/(?:we'?re hiring|join our team|position:)\s*([^\n.]{5,100})/i);
    if (match) position = match[1].trim();
  }
  
  return position.substring(0, 150);
}

function extractLocationFromText(text) {
  const patterns = [
    /(?:location|office|based)[:\s]*([^\n]{5,50})/i,
    /([A-Z][a-z]+,\s*[A-Z]{2})/,
    /(?:remote|hybrid|onsite)/i,
    /(?:city|state|country)[:\s]*([^\n]{3,30})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim().substring(0, 100);
  }
  
  if (text.toLowerCase().includes('remote')) return 'Remote';
  return '';
}

function extractSalary(text) {
  const patterns = [
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*[-–to]+\s*\$?[\d,]+(?:\.\d{2})?\s*(?:k|K)?)/i,
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*(?:per year|annually|\/year))/i,
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*(?:per hour|\/hr|hourly))/i,
    /(?:salary|compensation|pay|rate)[:\s]*(\$[^\n.]{5,40})/i,
    /(?:range|between)\s*(\$[\d,]+[^\n.]{10,50})/i,
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*[-–]\s*\$?[\d,]+(?:\.\d{2})?\s*(?:k|K)?)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let salary = (match[1] || match[0]).replace(/\s+/g, ' ').trim();
      if (salary.length > 5 && salary.length < 50) return salary;
    }
  }
  return '';
}

function formatSalary(salary) {
  if (!salary) return '';
  if (typeof salary === 'object') {
    if (salary.currency) {
      const min = salary.value?.min || salary.min || '';
      const max = salary.value?.max || salary.max || '';
      if (min && max) return `${salary.currency}${min} - ${salary.currency}${max}`;
    }
  }
  return String(salary);
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}
