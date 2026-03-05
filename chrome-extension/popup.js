const API_URL = 'http://localhost:8000/api';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('jobForm');
  const extractBtn = document.getElementById('extractBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  
  // Form fields
  const companyInput = document.getElementById('company');
  const positionInput = document.getElementById('position');
  const locationInput = document.getElementById('location');
  const jobUrlInput = document.getElementById('jobUrl');
  const salaryInput = document.getElementById('salary');
  const notesInput = document.getElementById('notes');

  // Initialize
  checkToken();
  loadSavedData();
  
  // Auto-extract on load for known job sites
  autoExtractOnLoad();

  // Extract button
  extractBtn.addEventListener('click', () => {
    extractData(true);
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveJob();
  });
});

async function checkToken() {
  const token = await getToken();
  if (!token) {
    // Try to get token from JobRoom tab
    const tabs = await chrome.tabs.query({ url: 'http://localhost:3000/*' });
    if (tabs.length > 0) {
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getToken' });
        if (response?.token) {
          await saveToken(response.token);
        }
      } catch (e) {
        console.log('Could not get token from JobRoom tab');
      }
    }
  }
}

async function loadSavedData() {
  const result = await chrome.storage.local.get(['jobData']);
  if (result.jobData) {
    fillForm(result.jobData);
  }
}

async function autoExtractOnLoad() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname.toLowerCase();
  
  // Auto-extract for known job sites
  const jobSites = ['linkedin', 'indeed', 'glassdoor', 'greenhouse', 'lever', 'workday', 'ziprecruiter', 'monster', 'careerbuilder'];
  const isJobSite = jobSites.some(site => hostname.includes(site));
  const isJobPage = hostname.includes('job') || hostname.includes('career') || hostname.includes('apply');
  
  if (isJobSite || isJobPage) {
    extractData(false);
  }
}

async function extractData(showNotification = true) {
  if (showNotification) {
    showStatus('Extracting job data...', 'success');
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'extractJobData' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Refresh the page and try again', 'error');
        return;
      }
      
      if (response?.data) {
        fillForm(response.data);
        
        // Save to storage
        chrome.storage.local.set({ jobData: response.data });
        
        if (showNotification) {
          showStatus('✅ Data extracted!', 'success');
        }
        
        // Highlight empty required fields
        if (!response.data.company || !response.data.position) {
          showStatus('⚠️ Please fill in missing fields', 'error');
        }
      } else {
        showStatus('Could not extract data. Please fill manually.', 'error');
      }
    });
  } catch (error) {
    showStatus('Extraction failed. Fill manually.', 'error');
  }
}

async function saveJob() {
  const token = await getToken();
  if (!token) {
    showStatus('Please login at localhost:3000 first', 'error');
    return;
  }

  const jobData = {
    company_name: document.getElementById('company').value.trim(),
    position_title: document.getElementById('position').value.trim(),
    location: document.getElementById('location').value.trim() || undefined,
    job_url: document.getElementById('jobUrl').value.trim() || undefined,
    salary_range: document.getElementById('salary').value.trim() || undefined,
    notes: document.getElementById('notes').value.trim() || undefined,
    status: 'wanted'
  };

  // Validate required fields
  if (!jobData.company_name || !jobData.position_title) {
    showStatus('Please fill in Company and Position', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.classList.add('loading');

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
      document.getElementById('jobForm').reset();
      chrome.storage.local.remove(['jobData']);
    } else {
      const error = await response.text();
      showStatus('Error: ' + error, 'error');
    }
  } catch (error) {
    showStatus('Connection error. Is backend running?', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
  }
}

function fillForm(data) {
  if (data.company) document.getElementById('company').value = data.company;
  if (data.position) document.getElementById('position').value = data.position;
  if (data.location) document.getElementById('location').value = data.location;
  if (data.url) document.getElementById('jobUrl').value = data.url;
  if (data.salary) document.getElementById('salary').value = data.salary;
  if (data.notes) document.getElementById('notes').value = data.notes;
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 4000);
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token'], (result) => {
      resolve(result.token);
    });
  });
}

async function saveToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ token }, resolve);
  });
}
