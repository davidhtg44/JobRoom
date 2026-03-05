import React, { useState, useEffect } from 'react';
import './App.css';
import Landing from './Landing';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const STATUSES = ['wanted', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authView, setAuthView] = useState('login'); // login, register, verify, forgot, reset
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLegal, setShowLegal] = useState(null); // null, 'privacy', 'terms', 'cookies', 'legal', 'faq'
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
    verification_code: '',
    reset_code: '',
    new_password: ''
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
        setSuccess(`Verification code sent to ${authData.email}. Please check your inbox (and spam folder).`);
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

  const handleResendCode = async () => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/resend-code?email=${encodeURIComponent(authData.email)}`, {
        method: 'POST'
      });
      if (response.ok) {
        setSuccess('Verification code resent! Please check your inbox.');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to resend code');
      }
    } catch (error) {
      setError('Connection error.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authData.email })
      });
      if (response.ok) {
        setSuccess('If your email exists, you will receive a reset code shortly.');
        setTimeout(() => {
          setAuthView('reset');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Request failed');
      }
    } catch (error) {
      setError('Connection error.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (authData.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/password-reset/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authData.email,
          code: authData.reset_code,
          new_password: authData.new_password
        })
      });
      if (response.ok) {
        setSuccess('Password reset successful! Please login.');
        setTimeout(() => {
          setAuthView('login');
          setAuthData({ ...authData, reset_code: '', new_password: '' });
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Reset failed');
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

  // Show landing page when not logged in
  const [showAuth, setShowAuth] = useState(false);
  
  if (!user && !showAuth) {
    return <Landing onGetStarted={() => setShowAuth(true)} />;
  }

  // Show auth forms
  if (!user && showAuth) {
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
              <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setAuthView('forgot'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                  Forgot Password?
                </button>
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
                onClick={handleResendCode}
                style={{ marginTop: '0.5rem' }}
              >
                📧 Resend Code
              </button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => setAuthView('register')}
                style={{ marginTop: '0.5rem' }}
              >
                Back
              </button>
            </form>
          )}

          {authView === 'forgot' && (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Enter your email and we'll send you a code to reset your password.
              </p>
              <button type="submit" className="auth-btn">Send Reset Code</button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => { setAuthView('login'); setError(''); }}
                style={{ marginTop: '0.5rem' }}
              >
                Back to Login
              </button>
            </form>
          )}

          {authView === 'reset' && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Reset Code</label>
                <input
                  type="text"
                  name="reset_code"
                  value={authData.reset_code}
                  onChange={handleAuthChange}
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="new_password"
                  value={authData.new_password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Password must be at least 6 characters.
              </p>
              <button type="submit" className="auth-btn">Reset Password</button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => { setAuthView('login'); setError(''); }}
                style={{ marginTop: '0.5rem' }}
              >
                Back to Login
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
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button 
                onClick={() => setShowAuth(false)} 
                style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontWeight: 500 }}
              >
                ← Back to Home
              </button>
            </div>
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

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>JobRoom</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLegal('privacy'); }}>Privacy Policy</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLegal('terms'); }}>Terms of Service</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLegal('cookies'); }}>Cookie Policy</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLegal('legal'); }}>Legal Notice</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowForm(true); }}>Add Application</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowSettings(true); }}>Settings</a></li>
              <li><a href="https://github.com/davidhtg44/JobRoom" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:jobroom.info@gmail.com">Contact Us</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLegal('faq'); }}>FAQ</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="footer-social">
              <a href="#" title="GitHub">🐙</a>
              <a href="#" title="Twitter">🐦</a>
              <a href="#" title="LinkedIn">💼</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} JobRoom. All rights reserved.</p>
          <p>Track your job applications with style.</p>
        </div>
      </footer>

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

      {/* Legal Modals */}
      {showLegal && (
        <div className="modal-overlay legal-modal" onClick={() => setShowLegal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {showLegal === 'privacy' && 'Privacy Policy'}
                {showLegal === 'terms' && 'Terms of Service'}
                {showLegal === 'cookies' && 'Cookie Policy'}
                {showLegal === 'legal' && 'Legal Notice'}
                {showLegal === 'faq' && 'FAQ'}
              </h2>
              <button className="btn-close" onClick={() => setShowLegal(null)}>×</button>
            </div>
            <div className="legal-content">
              {showLegal === 'privacy' && (
                <>
                  <h2>Privacy Policy</h2>
                  <p>At JobRoom, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.</p>
                  
                  <h3>1. Information We Collect</h3>
                  <p>We collect information you provide directly to us, including:</p>
                  <ul>
                    <li>Email address and password for account creation</li>
                    <li>Profile information (name, phone, bio)</li>
                    <li>Job application data you submit</li>
                  </ul>
                  
                  <h3>2. How We Use Your Information</h3>
                  <p>We use the information we collect to:</p>
                  <ul>
                    <li>Provide, maintain, and improve our services</li>
                    <li>Send you technical notices and support messages</li>
                    <li>Respond to your comments and questions</li>
                  </ul>
                  
                  <h3>3. Data Security</h3>
                  <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                  
                  <h3>4. Your Rights</h3>
                  <p>You have the right to access, update, or delete your personal information at any time through your account settings.</p>
                  
                  <h3>5. Contact Us</h3>
                  <p>If you have any questions about this Privacy Policy, please contact us at jobroom.info@gmail.com.</p>
                  
                  <p className="legal-updated">Last updated: March 2024</p>
                </>
              )}
              
              {showLegal === 'terms' && (
                <>
                  <h2>Terms of Service</h2>
                  <p>Welcome to JobRoom! These Terms of Service govern your use of our job application tracking platform.</p>
                  
                  <h3>1. Acceptance of Terms</h3>
                  <p>By accessing and using JobRoom, you accept and agree to be bound by these Terms of Service.</p>
                  
                  <h3>2. Use License</h3>
                  <p>Permission is granted to temporarily use JobRoom for personal job tracking purposes only.</p>
                  
                  <h3>3. User Responsibilities</h3>
                  <p>You agree to:</p>
                  <ul>
                    <li>Provide accurate and complete information</li>
                    <li>Maintain the security of your account</li>
                    <li>Not use the service for any illegal purposes</li>
                    <li>Not attempt to access other users' data</li>
                  </ul>
                  
                  <h3>4. Disclaimer</h3>
                  <p>JobRoom is provided "as is" without any warranties, express or implied.</p>
                  
                  <h3>5. Limitation of Liability</h3>
                  <p>JobRoom shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
                  
                  <h3>6. Changes to Terms</h3>
                  <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.</p>
                  
                  <p className="legal-updated">Last updated: March 2024</p>
                </>
              )}
              
              {showLegal === 'cookies' && (
                <>
                  <h2>Cookie Policy</h2>
                  <p>This Cookie Policy explains how JobRoom uses cookies and similar technologies.</p>
                  
                  <h3>1. What Are Cookies</h3>
                  <p>Cookies are small text files stored on your device when you visit our website.</p>
                  
                  <h3>2. Cookies We Use</h3>
                  <ul>
                    <li><strong>Authentication cookies:</strong> To keep you logged in</li>
                    <li><strong>Session cookies:</strong> To maintain your session</li>
                    <li><strong>Local storage:</strong> To store your preferences and token</li>
                  </ul>
                  
                  <h3>3. How to Control Cookies</h3>
                  <p>You can control cookies through your browser settings. However, disabling cookies may affect your ability to use certain features.</p>
                  
                  <h3>4. Third-Party Cookies</h3>
                  <p>We do not use third-party cookies on JobRoom.</p>
                  
                  <p className="legal-updated">Last updated: March 2024</p>
                </>
              )}
              
              {showLegal === 'legal' && (
                <>
                  <h2>Legal Notice</h2>
                  
                  <h3>Company Information</h3>
                  <p><strong>JobRoom</strong><br/>
                  Job Application Tracking Platform</p>
                  
                  <h3>Contact Information</h3>
                  <p>Email: jobroom.info@gmail.com</p>
                  
                  <h3>Registered Office</h3>
                  <p>Available upon request</p>
                  
                  <h3>VAT Number</h3>
                  <p>Available upon request</p>
                  
                  <h3>Director</h3>
                  <p>Available upon request</p>
                  
                  <h3>Intellectual Property</h3>
                  <p>All content, trademarks, logos, and intellectual property displayed on JobRoom are the property of their respective owners.</p>
                  
                  <h3>Governing Law</h3>
                  <p>These terms shall be governed by and construed in accordance with applicable laws.</p>
                  
                  <p className="legal-updated">Last updated: March 2024</p>
                </>
              )}
              
              {showLegal === 'faq' && (
                <>
                  <h2>Frequently Asked Questions</h2>
                  
                  <h3>How do I get started?</h3>
                  <p>Simply create an account, verify your email, and start adding job applications!</p>
                  
                  <h3>Is JobRoom free?</h3>
                  <p>Yes, JobRoom is completely free to use.</p>
                  
                  <h3>How do I use the Chrome extension?</h3>
                  <p>Install the extension from the chrome-extension folder, navigate to a job posting, click the extension icon, and let it auto-extract the job details.</p>
                  
                  <h3>Can I export my data?</h3>
                  <p>Currently, data is stored in your account. Export functionality is planned for future releases.</p>
                  
                  <h3>How do I reset my password?</h3>
                  <p>Contact jobroom.info@gmail.com for password reset assistance.</p>
                  
                  <h3>Is my data secure?</h3>
                  <p>Yes, we use industry-standard security measures including password hashing and JWT authentication.</p>
                  
                  <h3>Can I use JobRoom on mobile?</h3>
                  <p>Yes, JobRoom is fully responsive and works on all devices.</p>
                  
                  <p className="legal-updated">Last updated: March 2024</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
