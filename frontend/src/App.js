import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000/api';

const STATUSES = ['wanted', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showLogin, setShowLogin] = useState(true);
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
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
    full_name: ''
  });

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchApplications();
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
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed');
      }
    } catch (error) {
      setError('Connection error. Make sure the backend is running.');
    }
  };

  const handleRegister = async (e) => {
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
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      setError('Connection error. Make sure the backend is running.');
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
            <p>{showLogin ? 'Sign in to your account' : 'Create your account'}</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <form className="auth-form" onSubmit={showLogin ? handleLogin : handleRegister}>
            {!showLogin && (
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
            )}
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
            <button type="submit" className="auth-btn">
              {showLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div className="auth-switch">
            {showLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setShowLogin(!showLogin); setError(''); }}>
              {showLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app
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
    </div>
  );
}

export default App;
