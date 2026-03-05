// Content script for extracting job data from job posting pages
// Optimized for major job boards: LinkedIn, Indeed, Glassdoor, Google Jobs, etc.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    const data = extractJobData();
    sendResponse({ data });
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
  } else if (hostname.includes('google.com') && hostname.includes('jobs')) {
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
  } else {
    return extractGeneric();
  }
}

// LinkedIn Jobs
function extractLinkedIn() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  // Position title
  const titleSelectors = [
    'h4.top-card-layout__title a',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-test="job-title"]',
    '.job-title',
    'title'
  ];
  data.position = getTextFromSelectors(titleSelectors)
    .replace(/\s*-\s*LinkedIn.*$/i, '')
    .replace(/\s*\|.*$/i, '')
    .trim();
  
  // Company name
  const companySelectors = [
    '[data-test="company-name"] a',
    '.top-card-layout__card .sub-title-1 a',
    '[data-company-name]',
    '.company-name',
    '[data-test="company-info"] a'
  ];
  data.company = getTextFromSelectors(companySelectors).trim();
  
  // If no company found, try to extract from page structure
  if (!data.company) {
    const allText = document.body.innerText;
    const companyMatch = allText.match(/(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:recruiting|hiring)/i);
    if (companyMatch) data.company = companyMatch[1];
  }
  
  // Location
  const locationSelectors = [
    '[data-test="job-location"]',
    '.job-location',
    '[data-test="location-text"]',
    '.top-card-layout__bullet-item'
  ];
  data.location = getTextFromSelectors(locationSelectors)
    .replace(/^(?:Based in|Location:)\s*/i, '')
    .trim();
  
  // Salary
  const salaryText = document.body.innerText;
  data.salary = extractSalary(salaryText);
  
  // Notes
  data.notes = `Source: LinkedIn | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Indeed
function extractIndeed() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  // Position
  data.position = getTextFromSelectors([
    '#jobTitle',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-tn-element="jobTitle"]',
    'title'
  ]).replace(/\s*-\s*Indeed.*$/i, '').trim();
  
  // Company
  data.company = getTextFromSelectors([
    '[data-company-name]',
    '.companyName',
    '[data-tn-element="company-name"]',
    '.jobsearch-InlineCompanyRating'
  ]).trim();
  
  // Location
  data.location = getTextFromSelectors([
    '[data-testid="text-location"]',
    '.jobsearch-JobInfoHeader-subtitle',
    '[data-tn-element="location"]'
  ]).replace(/^(?:from|in)\s+/i, '').trim();
  
  // Salary
  const salaryEl = document.querySelector('[data-testid="attribute_snippet_test-container"]');
  if (salaryEl) data.salary = salaryEl.innerText.trim();
  
  if (!data.salary) {
    data.salary = extractSalary(document.body.innerText);
  }
  
  data.notes = `Source: Indeed | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Glassdoor
function extractGlassdoor() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  // Position
  data.position = getTextFromSelectors([
    '.jobTitle',
    '[data-test="job-title"]',
    'h1.job-title',
    'title'
  ]).replace(/\s*\|.*$/i, '').trim();
  
  // Company
  data.company = getTextFromSelectors([
    '.employer-name',
    '[data-test="employer-name"]',
    '.jobDetails .company',
    '.header .company'
  ]).trim();
  
  // Location
  data.location = getTextFromSelectors([
    '.location',
    '[data-test="location"]',
    '.job-location'
  ]).trim();
  
  // Salary
  const salaryEl = document.querySelector('.salary-estimate, [data-test="salary"], .job-salary');
  if (salaryEl) data.salary = salaryEl.innerText.trim();
  
  if (!data.salary) {
    data.salary = extractSalary(document.body.innerText);
  }
  
  data.notes = `Source: Glassdoor | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Google Jobs
function extractGoogleJobs() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  // Position
  data.position = getTextFromSelectors([
    'h2[data-md="title"]',
    '.job-title',
    'title'
  ]).trim();
  
  // Company and Location from structured data
  const structuredData = document.querySelector('script[type="application/ld+json"]');
  if (structuredData) {
    try {
      const json = JSON.parse(structuredData.innerText);
      if (json.hiringOrganization) {
        data.company = json.hiringOrganization.name || json.hiringOrganization;
      }
      if (json.jobLocation) {
        data.location = json.jobLocation.address || json.jobLocation;
      }
      if (json.baseSalary) {
        data.salary = formatSalary(json.baseSalary);
      }
    } catch (e) {}
  }
  
  if (!data.company) {
    data.company = getTextFromSelectors(['.company-name', '[data-tn-element="company-name"]']).trim();
  }
  
  if (!data.location) {
    data.location = getTextFromSelectors(['.location', '.job-location']).trim();
  }
  
  if (!data.salary) {
    data.salary = extractSalary(document.body.innerText);
  }
  
  data.notes = `Source: Google Jobs | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Greenhouse (common ATS)
function extractGreenhouse() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  // Company from header or meta
  data.company = getTextFromSelectors([
    '.company-name',
    'header h1',
    '.header-branding h1',
    'meta[name="application:company"]'
  ]).trim();
  
  // Position
  data.position = getTextFromSelectors([
    '#app-title',
    'h1.app-title',
    '.job-title',
    'title'
  ]).replace(/\s*-\s*Greenhouse.*$/i, '').trim();
  
  // Location
  data.location = getTextFromSelectors([
    '#location',
    '.location',
    '.job-location',
    'meta[name="application:location"]'
  ]).trim();
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Greenhouse | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Lever (common ATS)
function extractLever() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  // Company from URL or header
  const urlParts = window.location.pathname.split('/');
  data.company = urlParts[urlParts.indexOf('jobs') - 1] || 
                 getTextFromSelectors(['.company-name', 'header h1']).trim();
  
  // Position
  data.position = document.querySelector('.app-title')?.innerText?.trim() ||
                  getTextFromSelectors(['h1', 'title']).trim();
  
  // Location from table
  const locationRow = Array.from(document.querySelectorAll('tr'))
    .find(row => row.innerText.toLowerCase().includes('location'));
  if (locationRow) {
    data.location = locationRow.querySelector('td:last-child')?.innerText?.trim() || '';
  }
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Lever | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Workday
function extractWorkday() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  data.position = getTextFromSelectors([
    '[data-automation-id="jobTitle"]',
    '.job-title',
    'h1',
    'title'
  ]).trim();
  
  data.company = getTextFromSelectors([
    '[data-automation-id="company"]',
    '.company-name',
    'header .company'
  ]).trim();
  
  data.location = getTextFromSelectors([
    '[data-automation-id="location"]',
    '.job-location',
    '.location'
  ]).trim();
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Workday | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// ZipRecruiter
function extractZipRecruiter() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  data.position = getTextFromSelectors([
    '.job-title',
    'h1.job_title',
    '[data-test="job-title"]',
    'title'
  ]).trim();
  
  data.company = getTextFromSelectors([
    '.job-company',
    '.company_name',
    '[data-test="company-name"]'
  ]).trim();
  
  data.location = getTextFromSelectors([
    '.job-location',
    '.location',
    '.job_city_state'
  ]).trim();
  
  data.salary = getTextFromSelectors([
    '.job-salary',
    '.salary',
    '[data-test="salary"]'
  ]).trim();
  
  if (!data.salary) {
    data.salary = extractSalary(document.body.innerText);
  }
  
  data.notes = `Source: ZipRecruiter | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Monster
function extractMonster() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  data.position = getTextFromSelectors([
    '.job-title',
    'h1.job-title',
    'title'
  ]).trim();
  
  data.company = getTextFromSelectors([
    '.company-name',
    '.job-company',
    '[data-automation-id="companyName"]'
  ]).trim();
  
  data.location = getTextFromSelectors([
    '.job-location',
    '.job-city-state',
    '.location'
  ]).trim();
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: Monster | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// CareerBuilder
function extractCareerBuilder() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  data.position = getTextFromSelectors([
    '.job-title',
    'h1.job-title',
    'title'
  ]).trim();
  
  data.company = getTextFromSelectors([
    '.company-name',
    '.job-company',
    '[data-test="company-name"]'
  ]).trim();
  
  data.location = getTextFromSelectors([
    '.job-location',
    '.location'
  ]).trim();
  
  data.salary = extractSalary(document.body.innerText);
  data.notes = `Source: CareerBuilder | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Generic extractor for unknown sites
function extractGeneric() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };
  
  const title = document.title;
  const bodyText = document.body.innerText;
  
  // Try meta tags first
  data.company = getMetaContent('og:site_name') || 
                 getMetaContent('application:company') ||
                 extractCompanyFromText(bodyText);
  
  data.position = getMetaContent('og:title')?.replace(`${data.company} -`, '') ||
                  getMetaContent('application:job-title') ||
                  extractPositionFromTitle(title, bodyText);
  
  data.location = getMetaContent('application:location') ||
                  extractLocationFromText(bodyText);
  
  data.salary = extractSalary(bodyText);
  
  // Extract from URL
  if (!data.company) {
    const hostParts = window.location.hostname.replace('www.', '').split('.');
    data.company = capitalizeWords(hostParts[0]).replace(/careers|jobs|job|apply/i, '');
  }
  
  data.notes = `Source: ${window.location.hostname} | Saved: ${new Date().toLocaleDateString()}`;
  
  return data;
}

// Helper functions
function getTextFromSelectors(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText?.trim()) {
      return el.innerText.trim();
    }
  }
  return '';
}

function getMetaContent(property) {
  const meta = document.querySelector(`meta[property="${property}"]`) ||
               document.querySelector(`meta[name="${property}"]`);
  return meta?.getAttribute('content') || '';
}

function extractCompanyFromText(text) {
  // Look for "at Company" or "Company is hiring"
  const patterns = [
    /(?:apply|work|join)\s+(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)/i,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:is hiring|is looking|careers)/i,
    /(?:at|for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(?:we're|we are)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

function extractPositionFromTitle(title, bodyText) {
  // Clean title
  let position = title
    .replace(/\s*-\s*(?:LinkedIn|Indeed|Glassdoor|Google|Jobs|Careers).*$/i, '')
    .replace(/\s*\|.*$/i, '')
    .replace(/^(?:Job:|Position:|Hiring:)\s*/i, '')
    .trim();
  
  // If title is too long or generic, try body text
  if (position.length > 100 || position.length < 3) {
    const match = bodyText.match(/(?:we'?re hiring|join our team|position:)\s*([^\n.]{5,100})/i);
    if (match) position = match[1].trim();
  }
  
  return position;
}

function extractLocationFromText(text) {
  // Look for location patterns
  const patterns = [
    /(?:location|office|based)[:\s]*([^\n]{5,50})/i,
    /([A-Z][a-z]+,\s*[A-Z]{2})/,  // City, State
    /(?:remote|hybrid|onsite)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  
  if (text.toLowerCase().includes('remote')) return 'Remote';
  
  return '';
}

function extractSalary(text) {
  const patterns = [
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*[-–to]+\s*\$?[\d,]+(?:\.\d{2})?\s*(?:k|K)?)/i,
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*(?:per year|annually|\/year))/i,
    /(\$[\d,]+(?:\.\d{2})?\s*(?:k|K)?\s*(?:per hour|\/hr|hourly))/i,
    /(?:salary|compensation|pay|rate)[:\s]*(\$[^\n.]{5,30})/i,
    /(?:range|between)\s*(\$[\d,]+[^\n.]{10,40})/i,
    /(\$[\d,]+)\s*(?:k|K)/gi
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let salary = match[1] || match[0];
      // Clean up
      salary = salary.replace(/\s+/g, ' ').trim();
      if (salary.length > 5 && salary.length < 50) {
        return salary;
      }
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
