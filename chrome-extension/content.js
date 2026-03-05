// Content script for extracting job data from job posting pages
// Optimized for major job boards

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    try {
      const data = extractJobData();
      sendResponse({ data });
    } catch (error) {
      console.error('Extraction error:', error);
      sendResponse({ data: null });
    }
  }
  
  if (request.action === 'getToken') {
    const token = localStorage.getItem('jobroom_token') || localStorage.getItem('token');
    sendResponse({ token });
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

// LinkedIn Jobs
function extractLinkedIn() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  // Position title - multiple selectors for different LinkedIn layouts
  data.position = getText([
    'h4.top-card-layout__title a',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-test="job-title"]',
    '.job-title',
    'title'
  ]).replace(/\s*-\s*LinkedIn.*$/i, '').replace(/\s*\|.*$/i, '').trim().substring(0, 150);
  
  // Company name
  data.company = getText([
    '[data-test="company-name"] a',
    '.top-card-layout__card .sub-title-1 a',
    '[data-company-name]',
    '.company-name',
    '[data-test="company-info"] a',
    '.jobsearch-InlineCompanyRating a'
  ]).trim().substring(0, 100);
  
  // Location
  data.location = getText([
    '[data-test="job-location"]',
    '.job-location',
    '[data-test="location-text"]',
    '.top-card-layout__bullet-item',
    '.jobsearch-JobInfoHeader-subtitle div'
  ]).replace(/^(?:Based in|Location:)\s*/i, '').trim().substring(0, 100);
  
  // Salary from page text
  data.salary = extractSalary(document.body.innerText);
  
  data.notes = `Source: LinkedIn | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Indeed
function extractIndeed() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    '#jobTitle',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-tn-element="jobTitle"]',
    'title'
  ]).replace(/\s*-\s*Indeed.*$/i, '').trim().substring(0, 150);
  
  data.company = getText([
    '[data-company-name]',
    '.companyName',
    '[data-tn-element="company-name"]',
    '.jobsearch-InlineCompanyRating',
    '[data-tn-element="secondaryContainer"]'
  ]).trim().substring(0, 100);
  
  data.location = getText([
    '[data-testid="text-location"]',
    '.jobsearch-JobInfoHeader-subtitle',
    '[data-tn-element="location"]'
  ]).replace(/^(?:from|in)\s+/i, '').trim().substring(0, 100);
  
  // Salary
  const salaryEl = document.querySelector('[data-testid="attribute_snippet_test-container"]');
  data.salary = salaryEl ? salaryEl.innerText.trim() : extractSalary(document.body.innerText);
  
  data.notes = `Source: Indeed | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Glassdoor
function extractGlassdoor() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    '.jobTitle',
    '[data-test="job-title"]',
    'h1.job-title',
    'title'
  ]).replace(/\s*\|.*$/i, '').trim().substring(0, 150);
  
  data.company = getText([
    '.employer-name',
    '[data-test="employer-name"]',
    '.jobDetails .company',
    '.header .company',
    '.header__employerName'
  ]).trim().substring(0, 100);
  
  data.location = getText([
    '.location',
    '[data-test="location"]',
    '.job-location',
    '.jobDetails .location'
  ]).trim().substring(0, 100);
  
  // Salary
  const salaryEl = document.querySelector('.salary-estimate, [data-test="salary"], .job-salary, .salary-text');
  data.salary = salaryEl ? salaryEl.innerText.trim() : extractSalary(document.body.innerText);
  
  data.notes = `Source: Glassdoor | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Google Jobs
function extractGoogleJobs() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    'h2[data-md="title"]',
    '.job-title',
    'div[role="heading"]',
    'title'
  ]).trim().substring(0, 150);
  
  // Try structured data first
  const structuredData = document.querySelector('script[type="application/ld+json"]');
  if (structuredData) {
    try {
      const json = JSON.parse(structuredData.innerText);
      if (json.hiringOrganization) {
        data.company = typeof json.hiringOrganization === 'string' ? 
          json.hiringOrganization : (json.hiringOrganization.name || '');
      }
      if (json.jobLocation) {
        const location = json.jobLocation;
        data.location = location.address || location.name || location;
      }
      if (json.baseSalary) {
        data.salary = formatSalary(json.baseSalary);
      }
    } catch (e) {}
  }
  
  if (!data.company) {
    data.company = getText(['.company-name', '[data-tn-element="company-name"]']).trim().substring(0, 100);
  }
  
  if (!data.location) {
    data.location = getText(['.location', '.job-location']).trim().substring(0, 100);
  }
  
  if (!data.salary) {
    data.salary = extractSalary(document.body.innerText);
  }
  
  data.notes = `Source: Google Jobs | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Greenhouse
function extractGreenhouse() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.company = getText([
    '.company-name',
    'header h1',
    '.header-branding h1',
    'meta[name="application:company"]',
    '.header h2'
  ]).trim().substring(0, 100);
  
  data.position = getText([
    '#app-title',
    'h1.app-title',
    '.job-title',
    'title'
  ]).replace(/\s*-\s*Greenhouse.*$/i, '').trim().substring(0, 150);
  
  data.location = getText([
    '#location',
    '.location',
    '.job-location',
    'meta[name="application:location"]',
    '.location span'
  ]).trim().substring(0, 100);
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Greenhouse | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Lever
function extractLever() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  // Company from URL
  const urlParts = window.location.pathname.split('/');
  const companyIndex = urlParts.indexOf('jobs');
  data.company = companyIndex > 0 ? urlParts[companyIndex - 1] : '';
  
  if (!data.company) {
    data.company = getText(['.company-name', 'header h1', '.branding']).trim().substring(0, 100);
  }
  
  data.position = document.querySelector('.app-title')?.innerText?.trim().substring(0, 150) ||
                  getText(['h1', 'title']).trim().substring(0, 150);
  
  // Location from table
  const rows = document.querySelectorAll('table tr, .section-row');
  for (const row of rows) {
    const text = row.innerText.toLowerCase();
    if (text.includes('location')) {
      const cells = row.querySelectorAll('td, div');
      if (cells.length > 1) {
        data.location = cells[cells.length - 1].innerText.trim().substring(0, 100);
        break;
      }
    }
  }
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Lever | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Workday
function extractWorkday() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    '[data-automation-id="jobTitle"]',
    '.job-title',
    'h1',
    'title',
    '[data-automation-id="postTitle"]'
  ]).trim().substring(0, 150);
  
  data.company = getText([
    '[data-automation-id="company"]',
    '.company-name',
    'header .company',
    '[data-automation-id="organization"]'
  ]).trim().substring(0, 100);
  
  data.location = getText([
    '[data-automation-id="location"]',
    '.job-location',
    '.location',
    '[data-automation-id="primaryLocation"]'
  ]).trim().substring(0, 100);
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Workday | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// ZipRecruiter
function extractZipRecruiter() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    '.job-title',
    'h1.job_title',
    '[data-test="job-title"]',
    'title',
    '.job-description h1'
  ]).trim().substring(0, 150);
  
  data.company = getText([
    '.job-company',
    '.company_name',
    '[data-test="company-name"]',
    '.employer'
  ]).trim().substring(0, 100);
  
  data.location = getText([
    '.job-location',
    '.location',
    '.job_city_state',
    '.job-location span'
  ]).trim().substring(0, 100);
  
  data.salary = getText([
    '.job-salary',
    '.salary',
    '[data-test="salary"]',
    '.salary-range'
  ]).trim() || extractSalary(document.body.innerText);
  
  data.notes = `Source: ZipRecruiter | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Monster
function extractMonster() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    '.job-title',
    'h1.job-title',
    'title',
    '[data-automation-id="jobTitle"]'
  ]).trim().substring(0, 150);
  
  data.company = getText([
    '.company-name',
    '.job-company',
    '[data-automation-id="companyName"]',
    '.employer-name'
  ]).trim().substring(0, 100);
  
  data.location = getText([
    '.job-location',
    '.job-city-state',
    '.location',
    '[data-automation-id="jobLocation"]'
  ]).trim().substring(0, 100);
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Monster | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// CareerBuilder
function extractCareerBuilder() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText([
    '.job-title',
    'h1.job-title',
    'title',
    '[data-test="job-title"]'
  ]).trim().substring(0, 150);
  
  data.company = getText([
    '.company-name',
    '.job-company',
    '[data-test="company-name"]',
    '.employer'
  ]).trim().substring(0, 100);
  
  data.location = getText([
    '.job-location',
    '.location',
    '.job-location span'
  ]).trim().substring(0, 100);
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: CareerBuilder | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// SimplyHired
function extractSimplyHired() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText(['.job-title', 'h1', 'title']).trim().substring(0, 150);
  data.company = getText(['.company', '.employer-name']).trim().substring(0, 100);
  data.location = getText(['.location', '.job-location']).trim().substring(0, 100);
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: SimplyHired | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Dice
function extractDice() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText(['[data-automation-id="jobTitle"]', '.job-title', 'h1', 'title']).trim().substring(0, 150);
  data.company = getText(['[data-automation-id="companyName"]', '.company', '.employer']).trim().substring(0, 100);
  data.location = getText(['[data-automation-id="jobLocation"]', '.location', '.job-location']).trim().substring(0, 100);
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Dice | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// AngelList / Wellfound
function extractAngelList() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  data.position = getText(['.job-title', 'h1', 'title', '[class*="JobTitle"]']).trim().substring(0, 150);
  data.company = getText(['.company-name', '.company', '[class*="Company"]']).trim().substring(0, 100);
  data.location = getText(['.location', '.job-location', '[class*="Location"]']).trim().substring(0, 100);
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Wellfound | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Generic extractor for unknown sites
function extractGeneric() {
  const data = { company: '', position: '', location: '', url: window.location.href, salary: '', notes: '' };
  
  const title = document.title;
  const bodyText = document.body.innerText;
  
  // Meta tags
  data.company = getMeta('og:site_name') || 
                 getMeta('application:company') ||
                 extractCompanyFromText(bodyText);
  
  data.position = getMeta('og:title')?.replace(`${data.company} -`, '') ||
                  getMeta('application:job-title') ||
                  extractPositionFromTitle(title, bodyText);
  
  data.location = getMeta('application:location') ||
                  extractLocationFromText(bodyText);
  
  data.salary = extractSalary(bodyText);
  
  // Extract from URL
  if (!data.company || data.company.length < 2) {
    const hostParts = window.location.hostname.replace('www.', '').split('.');
    data.company = capitalizeWords(hostParts[0]).replace(/careers|jobs|job|apply/i, '').substring(0, 100);
  }
  
  data.notes = `Source: ${window.location.hostname} | Saved: ${new Date().toLocaleDateString()}`;
  
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

function getMeta(property) {
  const meta = document.querySelector(`meta[property="${property}"]`) ||
               document.querySelector(`meta[name="${property}"]`);
  return meta?.getAttribute('content') || '';
}

function extractCompanyFromText(text) {
  const patterns = [
    /(?:apply|work|join)\s+(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)/i,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:is hiring|is looking|careers)/i,
    /(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:we're|we are)/i
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
    /(?:remote|hybrid|onsite)/i
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
    /(?:range|between)\s*(\$[\d,]+[^\n.]{10,50})/i
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
