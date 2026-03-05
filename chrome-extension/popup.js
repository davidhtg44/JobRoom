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

  // Check for token on load
  checkToken();

  // Load saved job data
  chrome.storage.local.get(['jobData'], (result) => {
    if (result.jobData) {
      fillForm(result.jobData);
    }
  });

  // Auto-extract button
  extractBtn.addEventListener('click', async () => {
    showStatus('Extracting...', 'success');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to extract data
      chrome.tabs.sendMessage(tab.id, { action: 'extractJobData' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Refresh the page and try again', 'error');
          return;
        }
        
        if (response && response.data) {
          fillForm(response.data);
          
          // Save to storage for later
          chrome.storage.local.set({ jobData: response.data });
          
          showStatus('Data extracted successfully!', 'success');
        } else {
          showStatus('Could not extract data. Fill manually.', 'error');
        }
      });
    } catch (error) {
      showStatus('Extraction failed. Fill manually.', 'error');
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = await getToken();
    if (!token) {
      showStatus('Please login at localhost:3000 first', 'error');
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

    // Set loading state
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
        form.reset();
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
  });

  // Helper functions
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

  async function getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['token'], (result) => {
        resolve(result.token);
      });
    });
  }

  async function checkToken() {
    const token = await getToken();
    if (!token) {
      // Try to get token from JobRoom website via tab query
      chrome.tabs.query({ url: 'http://localhost:3000/*' }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getToken' }, (response) => {
            if (response && response.token) {
              chrome.storage.local.set({ token: response.token });
            }
          });
        }
      });
    }
  }
});
