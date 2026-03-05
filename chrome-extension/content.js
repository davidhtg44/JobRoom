// Content script for extracting job data from job posting pages

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    const data = extractJobData();
    sendResponse({ data });
  }
  
  if (request.action === 'getToken') {
    // Get token from localStorage and send back
    const token = localStorage.getItem('jobroom_token') || localStorage.getItem('token');
    sendResponse({ token });
  }
});

function extractJobData() {
  const data = {
    company: '',
    position: '',
    location: '',
    url: window.location.href,
    salary: '',
    notes: ''
  };

  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText;

  // Try to extract from meta tags
  const ogSiteName = getMetaContent('og:site_name') || getMetaContent('og:site');
  const ogTitle = getMetaContent('og:title');
  const twitterSite = getMetaContent('twitter:site');

  // Extract company
  data.company = extractCompany(ogSiteName, twitterSite, title, bodyText);

  // Extract position
  data.position = extractPosition(ogTitle, title, bodyText);

  // Extract location
  data.location = extractLocation(bodyText);

  // Extract salary
  data.salary = extractSalary(bodyText);

  // Generate notes from page
  data.notes = generateNotes(title);

  return data;
}

function getMetaContent(property) {
  const meta = document.querySelector(`meta[property="${property}"]`) ||
               document.querySelector(`meta[name="${property}"]`);
  return meta ? meta.getAttribute('content') : '';
}

function extractCompany(ogSiteName, twitterSite, title, bodyText) {
  // Check meta tags first
  if (ogSiteName) return cleanCompanyName(ogSiteName);
  if (twitterSite) return cleanCompanyName(twitterSite.replace('@', ''));

  // Common job board patterns
  const jobBoardPatterns = [
    { pattern: /(?:apply to|work at|jobs at)\s+([^\n|]+)/i, group: 1 },
    { pattern: /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\s+(?:is hiring|jobs|careers)/i, group: 1 },
    { pattern: /join\s+([^\n]+)/i, group: 1 }
  ];

  for (const { pattern, group } of jobBoardPatterns) {
    const match = bodyText.match(pattern);
    if (match) return cleanCompanyName(match[group]);
  }

  // Extract from URL
  const urlHost = window.location.hostname;
  const companyFromUrl = urlHost
    .replace('www.', '')
    .replace('careers.', '')
    .replace('jobs.', '')
    .replace('.com', '')
    .replace('.co', '')
    .replace('.io', '')
    .replace(/-/g, ' ');
  
  if (companyFromUrl && companyFromUrl.length > 2) {
    return capitalizeWords(companyFromUrl.split('.')[0]);
  }

  return '';
}

function extractPosition(ogTitle, title, bodyText) {
  // Check OG title first
  if (ogTitle && ogTitle.toLowerCase().includes('job')) {
    return cleanPosition(ogTitle);
  }

  // Common patterns for job titles
  const positionPatterns = [
    /(?:we'?re hiring|join our team)[:\s]+([^\n]+)/i,
    /(?:position|role|title)[:\s]+([^\n]+)/i,
    /(?:job title)[:\s]*([^\n]+)/i,
    /(?:hiring[:\s]+)([^\n]+(?:engineer|developer|designer|manager|analyst|specialist)[^\n]*)/i
  ];

  for (const pattern of positionPatterns) {
    const match = bodyText.match(pattern);
    if (match) return cleanPosition(match[1]);
  }

  // Extract from title tag
  const titleLower = title.toLowerCase();
  if (titleLower.includes('job') || titleLower.includes('career') || titleLower.includes('position')) {
    return cleanPosition(document.title);
  }

  return '';
}

function extractLocation(bodyText) {
  // Look for location patterns
  const locationPatterns = [
    /(?:location|office|based)[:\s]*([^\n]+)/i,
    /(?:remote|hybrid|onsite)/i,
    /([A-Z][a-z]+,\s*[A-Z]{2})/,  // City, State format
    /([A-Z][a-z]+\s+[A-Z]{2}\s+\d{5})/,  // City, State ZIP
  ];

  for (const pattern of locationPatterns) {
    const match = bodyText.match(pattern);
    if (match) return match[0].trim();
  }

  // Check for remote
  if (bodyText.toLowerCase().includes('remote')) {
    return 'Remote';
  }

  return '';
}

function extractSalary(bodyText) {
  // Salary patterns
  const salaryPatterns = [
    /(\$[\d,]+(?:k)?\s*[-–to]+\s*\$?[\d,]+(?:k)?)/i,
    /(\$[\d,]+(?:k)?\s*(?:per year|annually|\/year))/i,
    /(\$[\d,]+(?:k)?\s*(?:per hour|\/hr|hourly))/i,
    /(?:salary|compensation|pay)[:\s]*(\$[^\n]+)/i,
    /(?:range|between)\s*(\$[\d,]+[^.\n]{10,30})/i
  ];

  for (const pattern of salaryPatterns) {
    const match = bodyText.match(pattern);
    if (match) return match[1] || match[0];
  }

  return '';
}

function generateNotes(title) {
  const notes = [];
  
  // Add source URL
  notes.push(`Source: ${window.location.hostname}`);
  
  // Add date
  notes.push(`Saved: ${new Date().toLocaleDateString()}`);

  return notes.join(' | ');
}

// Helper functions
function cleanCompanyName(name) {
  if (!name) return '';
  return name
    .replace(/^(?:join|work at|apply to|careers at)\s+/i, '')
    .replace(/(?:\s+-\s+.*|$)/, '')
    .replace(/^(?:We'?re Hiring[:\s]*)/i, '')
    .trim()
    .substring(0, 100);
}

function cleanPosition(position) {
  if (!position) return '';
  return position
    .replace(/(?:\s+-\s+.*|$)/, '')
    .replace(/(?:\s+\|.*)/, '')
    .replace(/^(?:Job Title[:\s]*)/i, '')
    .trim()
    .substring(0, 150);
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}
