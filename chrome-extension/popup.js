const API_URL = 'https://jobroom-api.onrender.com/api';

// Check token on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const token = await getToken();
  
  if (!token) {
    showLoginPrompt();
  } else {
    const valid = await validateToken(token);
    if (!valid) {
      showLoginPrompt();
    } else {
      initializeForm();
    }
  }
});

function showLoginPrompt() {
  const container = document.querySelector('.container');
  container.innerHTML = `
    <div class="login-prompt">
      <h2>Login Required</h2>
      <p>Please log in to JobRoom to save jobs</p>
      <button id="openJobRoom" class="btn btn-primary btn-block">
        Open JobRoom
      </button>
      <button id="refreshToken" class="btn btn-secondary btn-block" style="margin-top: 0.5rem">
        I'm Logged In (Refresh)
      </button>
      <p class="help-text">Make sure you're logged in at localhost:3000</p>
      <div id="prompt-status" class="status" style="display:none"></div>
    </div>
  `;
  
  document.getElementById('openJobRoom').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://frontend-7xxwj55n6-davidhtg44s-projects.vercel.app' });
  });
  
  document.getElementById('refreshToken').addEventListener('click', async () => {
    const btn = document.getElementById('refreshToken');
    btn.textContent = 'Checking...';
    btn.disabled = true;
    
    try {
      const tabs = await chrome.tabs.query({ url: 'https://frontend-7xxwj55n6-davidhtg44s-projects.vercel.app/*' });
      
      if (tabs.length === 0) {
        showPromptStatus('Please open JobRoom first', 'error');
        btn.textContent = "I'm Logged In (Refresh)";
        btn.disabled = false;
        return;
      }
      
      const tab = tabs[0];
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return localStorage.getItem('token');
        }
      });
      
      if (results && results[0] && results[0].result) {
        const token = results[0].result;
        if (token) {
          await chrome.storage.local.set({ token });
          
          const valid = await validateToken(token);
          if (valid) {
            showPromptStatus('Connected!', 'success');
            setTimeout(() => location.reload(), 1000);
            return;
          }
        }
      }
      
      showPromptStatus('Not logged in. Please login first.', 'error');
      btn.textContent = "I'm Logged In (Refresh)";
      btn.disabled = false;
      
    } catch (error) {
      console.error('Sync error:', error);
      showPromptStatus('Error syncing. Refresh the JobRoom page.', 'error');
      btn.textContent = "I'm Logged In (Refresh)";
      btn.disabled = false;
    }
  });
}

function showPromptStatus(message, type) {
  const statusEl = document.getElementById('prompt-status');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }
}

async function initializeForm() {
  const form = document.getElementById('jobForm');
  const extractBtn = document.getElementById('extractBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const extractedBanner = document.getElementById('extractedBanner');
  
  const companyInput = document.getElementById('company');
  const positionInput = document.getElementById('position');
  const locationInput = document.getElementById('location');
  const jobUrlInput = document.getElementById('jobUrl');
  const salaryInput = document.getElementById('salary');
  const notesInput = document.getElementById('notes');

  await loadSavedData();
  await autoExtractOnLoad();
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && !jobUrlInput.value) {
    jobUrlInput.value = tab.url;
  }
  
  extractBtn.addEventListener('click', () => extractData(true));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveJob();
  });
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
    setTimeout(() => extractData(false), 500);
  }
}

async function extractData(showNotification = true) {
  const statusEl = document.getElementById('status');
  
  if (showNotification) {
    statusEl.textContent = 'Extracting...';
    statusEl.className = 'status success';
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      statusEl.textContent = 'No active tab found';
      statusEl.className = 'status error';
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'extractJobData' }, (response) => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = 'Refresh page and try again';
        statusEl.className = 'status error';
        return;
      }
      
      if (response?.data) {
        fillForm(response.data);
        saveToStorage(response.data);
        showExtractedBanner();
        
        if (showNotification) {
          statusEl.textContent = 'Data extracted!';
          statusEl.className = 'status success';
        }
        
        if (!response.data.company || !response.data.position) {
          setTimeout(() => {
            statusEl.textContent = 'Please fill missing fields';
            statusEl.className = 'status error';
          }, 2000);
        }
      } else {
        statusEl.textContent = 'No data found. Fill manually.';
        statusEl.className = 'status error';
      }
    });
  } catch (error) {
    console.error('Extraction error:', error);
    statusEl.textContent = 'Extraction failed';
    statusEl.className = 'status error';
  }
}

async function saveJob() {
  const token = await getToken();
  if (!token) {
    showLoginPrompt();
    return;
  }

  const statusEl = document.getElementById('status');
  const jobData = {
    company_name: document.getElementById('company').value.trim(),
    position_title: document.getElementById('position').value.trim(),
    location: document.getElementById('location').value.trim() || undefined,
    job_url: document.getElementById('jobUrl').value.trim() || undefined,
    salary_range: document.getElementById('salary').value.trim() || undefined,
    notes: document.getElementById('notes').value.trim() || undefined,
    status: 'wanted'
  };

  if (!jobData.company_name || !jobData.position_title) {
    statusEl.textContent = 'Fill Company & Position';
    statusEl.className = 'status error';
    return;
  }

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
      statusEl.textContent = 'Saved to JobRoom!';
      statusEl.className = 'status success';
      document.getElementById('jobForm').reset();
      chrome.storage.local.remove(['jobData']);
      hideExtractedBanner();
    } else {
      const error = await response.text();
      statusEl.textContent = 'Error: ' + error;
      statusEl.className = 'status error';
    }
  } catch (error) {
    statusEl.textContent = 'Connection error';
    statusEl.className = 'status error';
    console.error('Save error:', error);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
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

async function validateToken(token) {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}
