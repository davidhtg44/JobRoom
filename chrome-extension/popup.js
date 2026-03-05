const API_URL = 'http://localhost:8000/api';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('jobForm');
  const extractBtn = document.getElementById('extractBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const notLoggedInEl = document.getElementById('notLoggedIn');
  const openLoginBtn = document.getElementById('openLogin');
  const extractedBanner = document.getElementById('extractedBanner');
  
  // Form fields
  const companyInput = document.getElementById('company');
  const positionInput = document.getElementById('position');
  const locationInput = document.getElementById('location');
  const jobUrlInput = document.getElementById('jobUrl');
  const salaryInput = document.getElementById('salary');
  const notesInput = document.getElementById('notes');

  // Initialize
  init();
});

async function init() {
  await checkToken();
  await loadSavedData();
  await autoExtractOnLoad();
  
  // Set current URL as job URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && !jobUrlInput.value) {
    jobUrlInput.value = tab.url;
  }
  
  // Event listeners
  document.getElementById('extractBtn').addEventListener('click', () => extractData(true));
  document.getElementById('jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveJob();
  });
  document.getElementById('openLogin').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });
}

async function checkToken() {
  const token = await getToken();
  if (!token) {
    showNotLoggedIn();
  }
}

function showNotLoggedIn() {
  document.getElementById('notLoggedIn').style.display = 'block';
  document.getElementById('jobForm').style.display = 'none';
  document.getElementById('extractBtn').parentElement.style.display = 'none';
}

async function loadSavedData() {
  const result = await chrome.storage.local.get(['jobData']);
  if (result.jobData) {
    fillForm(result.jobData);
    showExtractedBanner();
  }
}

async function autoExtractOnLoad() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  
  const hostname = new URL(tab.url).hostname.toLowerCase();
  
  // Auto-extract for known job sites
  const jobSites = [
    'linkedin', 'indeed', 'glassdoor', 'greenhouse', 'lever', 
    'workday', 'ziprecruiter', 'monster', 'careerbuilder',
    'google.com', 'simplyhired', 'dice', 'angel.co', 'wellfound'
  ];
  
  const isJobSite = jobSites.some(site => hostname.includes(site));
  const isJobPage = hostname.includes('job') || 
                    hostname.includes('career') || 
                    hostname.includes('apply') ||
                    hostname.includes('position');
  
  if (isJobSite || isJobPage) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => extractData(false), 500);
  }
}

async function extractData(showNotification = true) {
  if (showNotification) {
    showStatus('Extracting...', 'success');
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'extractJobData' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Refresh page and try again', 'error');
        return;
      }
      
      if (response?.data) {
        fillForm(response.data);
        saveToStorage(response.data);
        showExtractedBanner();
        
        if (showNotification) {
          showStatus('✅ Data extracted!', 'success');
        }
        
        // Validate required fields
        if (!response.data.company || !response.data.position) {
          setTimeout(() => {
            showStatus('⚠️ Please fill missing fields', 'error');
          }, 2000);
        }
      } else {
        showStatus('No data found. Fill manually.', 'error');
      }
    });
  } catch (error) {
    console.error('Extraction error:', error);
    showStatus('Extraction failed', 'error');
  }
}

async function saveJob() {
  const token = await getToken();
  if (!token) {
    showNotLoggedIn();
    return;
  }

  const jobData = {
    company_name: companyInput.value.trim(),
    position_title: positionInput.value.trim(),
    location: locationInput.value.trim() || undefined,
    job_url: jobUrlInput.value.trim() || undefined,
    salary_range: salaryInput.value.trim() || undefined,
    notes: notesInput.value.trim() || undefined,
    status: 'wanted'
  };

  // Validate required fields
  if (!jobData.company_name || !jobData.position_title) {
    showStatus('⚠️ Fill Company & Position', 'error');
    return;
  }

  // Set loading state
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    const response = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(jobData)
    });

    if (response.ok) {
      showStatus('✅ Saved to JobRoom!', 'success');
      form.reset();
      chrome.storage.local.remove(['jobData']);
      hideExtractedBanner();
    } else {
      const error = await response.text();
      showStatus('Error: ' + error, 'error');
    }
  } catch (error) {
    showStatus('Connection error', 'error');
    console.error('Save error:', error);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

function fillForm(data) {
  if (data.company) companyInput.value = data.company;
  if (data.position) positionInput.value = data.position;
  if (data.location) locationInput.value = data.location;
  if (data.url) jobUrlInput.value = data.url;
  if (data.salary) salaryInput.value = data.salary;
  if (data.notes) notesInput.value = data.notes;
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 4000);
}

function showExtractedBanner() {
  document.getElementById('extractedBanner').style.display = 'flex';
}

function hideExtractedBanner() {
  document.getElementById('extractedBanner').style.display = 'none';
}

async function saveToStorage(data) {
  await chrome.storage.local.set({ jobData: data });
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token'], (result) => {
      resolve(result.token);
    });
  });
}
