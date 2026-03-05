import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000/api';

const STATUSES = ['wanted', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authView, setAuthView] = useState('login'); // login, register, verify
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    position_title: '',
    job_url: '',
    status: 'wanted',
    location: '',
    salary_range: '',
    notes: '',
    contact_name: '',
    contact_email: '',
    date_applied: ''
  });
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    full_name: '',
    verification_code: ''
  });
  const [settingsData, setSettingsData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchApplications();
      setSettingsData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        password: '',
        confirm_password: ''
      });
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleRegisterInit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authData.email, 
          password: authData.password,
          full_name: authData.full_name || undefined
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSuccess(`Verification code sent to ${authData.email}. Check console for debug code.`);
        console.log('📧 Verification code:', data.debug_code);
        setAuthView('verify');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      setError('Connection error. Make sure the backend is running.');
    }
  };

  const handleRegisterVerify = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authData.email, 
          password: authData.password,
          full_name: authData.full_name || undefined,
          verification_code: authData.verification_code
        })
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        // Sync token with Chrome extension
        syncTokenWithExtension(data.access_token);
        setAuthView('login');
        setSuccess('Account created successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Verification failed');
      }
    } catch (error) {
      setError('Connection error.');
    }
  };

  // Sync token with Chrome extension via localStorage event
  const syncTokenWithExtension = (token) => {
    // Store token in a format the extension can access via content script
    localStorage.setItem('jobroom_token', token);
    // Trigger storage event for extension content script
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authData.email, password: authData.password })
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        // Sync token with Chrome extension
        syncTokenWithExtension(data.access_token);
        setSuccess('Welcome back!');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed');
      }
    } catch (error) {
      setError('Connection error. Make sure the backend is running.');
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setError('');
    
    if (settingsData.password && settingsData.password !== settingsData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      const updateData = {
        full_name: settingsData.full_name || undefined,
        phone: settingsData.phone || undefined,
        bio: settingsData.bio || undefined
      };
      
      if (settingsData.password) {
        updateData.password = settingsData.password;
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setSuccess('Profile updated successfully!');
        setSettingsData({ ...settingsData, password: '', confirm_password: '' });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Update failed');
      }
    } catch (error) {
      setError('Connection error.');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setApplications([]);
    localStorage.removeItem('token');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const url = editingId
      ? `${API_URL}/applications/${editingId}`
      : `${API_URL}/applications`;
    const method = editingId ? 'PUT' : 'POST';

    const submitData = { ...formData };
    if (submitData.date_applied) {
      submitData.date_applied = new Date(submitData.date_applied).toISOString();
    } else {
      delete submitData.date_applied;
    }
    if (!submitData.job_url) delete submitData.job_url;
    if (!submitData.location) delete submitData.location;
    if (!submitData.salary_range) delete submitData.salary_range;
    if (!submitData.notes) delete submitData.notes;
    if (!submitData.contact_name) delete submitData.contact_name;
    if (!submitData.contact_email) delete submitData.contact_email;

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || 'Error saving application');
        return;
      }
      
      fetchApplications();
      resetForm();
      setSuccess(editingId ? 'Application updated!' : 'Application saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setError('Error connecting to server');
    }
  };

  const handleEdit = (app) => {
    setFormData({
      company_name: app.company_name,
      position_title: app.position_title,
      job_url: app.job_url || '',
      status: app.status,
      location: app.location || '',
      salary_range: app.salary_range || '',
      notes: app.notes || '',
      contact_name: app.contact_name || '',
      contact_email: app.contact_email || '',
      date_applied: app.date_applied ? app.date_applied.split('T')[0] : ''
    });
    setEditingId(app.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await fetch(`${API_URL}/applications/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchApplications();
        setSuccess('Application deleted');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error deleting application:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      position_title: '',
      job_url: '',
      status: 'wanted',
      location: '',
      salary_range: '',
      notes: '',
      contact_name: '',
      contact_email: '',
      date_applied: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleSettingsChange = (e) => {
    setSettingsData({ ...settingsData, [e.target.name]: e.target.value });
  };

  // Stats calculation
  const stats = STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter(app => app.status === status).length;
    return acc;
  }, {});

  // Auth pages
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>JobRoom</h1>
            <p>
              {authView === 'login' && 'Sign in to your account'}
              {authView === 'register' && 'Create your account'}
              {authView === 'verify' && 'Enter verification code'}
            </p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {authView === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={authData.password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="auth-btn">Sign In</button>
            </form>
          )}

          {authView === 'register' && (
            <form className="auth-form" onSubmit={handleRegisterInit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={authData.full_name}
                  onChange={handleAuthChange}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={authData.password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="auth-btn">Send Verification Code</button>
            </form>
          )}

          {authView === 'verify' && (
            <form className="auth-form" onSubmit={handleRegisterVerify}>
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  name="verification_code"
                  value={authData.verification_code}
                  onChange={handleAuthChange}
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" className="auth-btn">Verify & Create Account</button>
              <button 
                type="button" 
                className="auth-btn auth-btn-secondary"
                onClick={() => setAuthView('register')}
              >
                Back
              </button>
            </form>
          )}
          
          <div className="auth-switch">
            {authView === 'login' && (
              <>
                Don't have an account?{' '}
                <button onClick={() => { setAuthView('register'); setError(''); }}>Sign Up</button>
              </>
            )}
            {authView === 'register' && (
              <>
                Already have an account?{' '}
                <button onClick={() => { setAuthView('login'); setError(''); }}>Sign In</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main app with settings modal
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">📋</div>
          <h1>JobRoom</h1>
        </div>
        <div className="user-menu">
          <div className="user-info">
            <div className="user-name">{user.full_name || 'User'}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setShowSettings(true)}>Settings</button>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="main-content">
        {/* Stats Bar - Compact */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{applications.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.wanted}</div>
            <div className="stat-label">Wanted</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.applied}</div>
            <div className="stat-label">Applied</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.interview}</div>
            <div className="stat-label">Interview</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.offer}</div>
            <div className="stat-label">Offer</div>
          </div>
        </div>

        {/* Applications Card */}
        <div className="content-card">
          <div className="card-header">
            <h2>Applications {applications.length > 0 && `(${applications.length})`}</h2>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Application'}
            </button>
          </div>

          {showForm && (
            <div className="form-panel">
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Position Title *</label>
                    <input
                      type="text"
                      name="position_title"
                      value={formData.position_title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Job URL</label>
                    <input
                      type="url"
                      name="job_url"
                      value={formData.job_url}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Range</label>
                    <input
                      type="text"
                      name="salary_range"
                      value={formData.salary_range}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date Applied</label>
                    <input
                      type="date"
                      name="date_applied"
                      value={formData.date_applied}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Name</label>
                    <input
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Update' : 'Save'} Application
                  </button>
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p>No applications yet. Click "+ Add Application" to get started.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  applications.map(app => (
                    <tr key={app.id}>
                      <td data-label="Company">
                        <strong>{app.company_name}</strong>
                        {app.job_url && (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="company-link">
                            🔗 View Job
                          </a>
                        )}
                      </td>
                      <td data-label="Position">{app.position_title}</td>
                      <td data-label="Status">
                        <span className={`status-badge status-${app.status}`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                      <td data-label="Location">{app.location || '—'}</td>
                      <td data-label="Applied">
                        {app.date_applied 
                          ? new Date(app.date_applied).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })
                          : '—'
                        }
                      </td>
                      <td data-label="Actions">
                        <button className="btn-sm btn-edit" onClick={() => handleEdit(app)}>Edit</button>
                        <button className="btn-sm btn-delete" onClick={() => handleDelete(app.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="btn-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form className="settings-form" onSubmit={handleSettingsSave}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={settingsData.full_name}
                  onChange={handleSettingsChange}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="disabled-input"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={settingsData.phone}
                  onChange={handleSettingsChange}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={settingsData.bio}
                  onChange={handleSettingsChange}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <hr className="divider" />
              <div className="form-group">
                <label>New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  name="password"
                  value={settingsData.password}
                  onChange={handleSettingsChange}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={settingsData.confirm_password}
                  onChange={handleSettingsChange}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
