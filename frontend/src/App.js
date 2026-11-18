import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Landing from './Landing';

const API_URL = '/api';

const STATUSES = ['wanted', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

const STATUS_LABELS = {
  wanted: 'Wanted',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1);

const getErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.detail || fallback;
  } catch {
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
};

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      <span className="toast-icon">
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss notification">×</button>
    </div>
  );
}

// Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
            <button 
              className="btn-primary" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" aria-label="Loading" role="status">
      <div className="skeleton skeleton-header"></div>
      <div className="skeleton skeleton-line"></div>
      <div className="skeleton skeleton-line short"></div>
      <div className="skeleton skeleton-card"></div>
      <div className="skeleton skeleton-card"></div>
    </div>
  );
}

// Confirmation Modal component
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', confirmVariant = 'danger' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="confirm-title">{title}</h2>
          <button className="btn-close" onClick={onCancel} aria-label="Close dialog">×</button>
        </div>
        <div className="legal-content" style={{ padding: '1.5rem' }}>
          <p>{message}</p>
        </div>
        <div className="form-actions" style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>
          <button 
            type="button" 
            className={`btn-primary ${confirmVariant === 'danger' ? 'btn-delete-confirm' : ''}`}
            onClick={onConfirm}
            style={{ background: confirmVariant === 'danger' ? '#dc2626' : '#1a1a2e' }}
          >
            {confirmText}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Form validation utilities
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /[0-9]/.test(password);
};

const validateApplicationForm = (data) => {
  const errors = {};
  if (!data.company_name?.trim()) errors.company_name = 'Company name is required';
  if (!data.position_title?.trim()) errors.position_title = 'Position title is required';
  if (data.contact_email && !validateEmail(data.contact_email)) {
    errors.contact_email = 'Invalid email format';
  }
  if (data.job_url && !data.job_url.startsWith('http')) {
    errors.job_url = 'URL must start with http:// or https://';
  }
  return errors;
};

// Job Platforms Data
const JOB_PLATFORMS = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs', color: '#0A66C2', initials: 'in', region: 'global' },
  { name: 'Indeed', url: 'https://www.indeed.com', color: '#2557A7', initials: 'in', region: 'global' },
  { name: 'Glassdoor', url: 'https://www.glassdoor.com/index.htm', color: '#0CAA41', initials: 'gd', region: 'global' },
  { name: 'Google Jobs', url: 'https://www.google.com/search?q=jobs', color: '#4285F4', initials: 'G', region: 'global' },
  { name: 'Greenhouse', url: 'https://www.greenhouse.io', color: '#24A47B', initials: 'gh', region: 'global' },
  { name: 'Lever', url: 'https://www.lever.co', color: '#1A1A2E', initials: 'L', region: 'global' },
  { name: 'Workday', url: 'https://www.workday.com', color: '#F48120', initials: 'wd', region: 'global' },
  { name: 'ZipRecruiter', url: 'https://www.ziprecruiter.com', color: '#E8604C', initials: 'zr', region: 'us' },
  { name: 'Monster', url: 'https://www.monster.com', color: '#E3183D', initials: 'm', region: 'global' },
  { name: 'Wellfound', url: 'https://wellfound.com', color: '#FF6B6B', initials: 'wf', region: 'global' },
  { name: 'Dice', url: 'https://www.dice.com', color: '#E31837', initials: 'd', region: 'us' },
  { name: 'Adzuna', url: 'https://www.adzuna.com', color: '#5A9BD5', initials: 'a', region: 'uk' },
];

const REGIONS = [
  { id: 'all', label: 'All Regions' },
  { id: 'global', label: 'Global / Remote' },
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'UK & Europe' },
];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authView, setAuthView] = useState('login');
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLegal, setShowLegal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [toasts, setToasts] = useState([]);
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
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; }
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [activeRegion, setActiveRegion] = useState('all');
  const [fetchingUser, setFetchingUser] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Toast management
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Fetch user - now re-runs when token changes
  const fetchUser = useCallback(async () => {
    if (!token) return;
    setFetchingUser(true);
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
    } finally {
      setFetchingUser(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('darkMode', darkMode); } catch {}
  }, [darkMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key closes modals
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        if (showLegal) setShowLegal(null);
        if (showForm) resetForm();
        if (deleteConfirm.isOpen) setDeleteConfirm({ isOpen: false, id: null });
      }
      // Ctrl/Cmd + K to focus search or add new
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!showForm) {
          setShowForm(true);
          setTimeout(() => {
            document.querySelector('input[name="company_name"]')?.focus();
          }, 100);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, showLegal, showForm, deleteConfirm.isOpen]);

  const fetchApplications = async () => {
    setLoading(true);
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
      addToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterInit = async (e) => {
    e.preventDefault();
    setError('');
    setFormErrors({});
    
    if (!validateEmail(authData.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    if (!validatePassword(authData.password)) {
      setFormErrors({ password: 'Password must be at least 8 characters with uppercase, lowercase, and number' });
      return;
    }

    setSubmittingForm(true);
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
        addToast(`Verification code sent to ${authData.email}`, 'success');
        setAuthView('verify');
      } else {
        const errorMessage = await getErrorMessage(response, 'Registration failed');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error. Make sure the backend is running.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleRegisterVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittingForm(true);
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
        syncTokenWithExtension(data.access_token);
        setAuthView('login');
        addToast('Account created successfully!', 'success');
      } else {
        const errorMessage = await getErrorMessage(response, 'Verification failed');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSubmittingForm(true);
    try {
      const response = await fetch(`${API_URL}/auth/resend-code?email=${encodeURIComponent(authData.email)}`, {
        method: 'POST'
      });
      if (response.ok) {
        addToast('Verification code resent! Please check your inbox.', 'success');
      } else {
        const errorMessage = await getErrorMessage(response, 'Failed to resend code');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(authData.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    setSubmittingForm(true);
    try {
      const response = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authData.email })
      });
      if (response.ok) {
        addToast('If your email exists, you will receive a reset code shortly.', 'success');
        setTimeout(() => {
          setAuthView('reset');
        }, 2000);
      } else {
        const errorMessage = await getErrorMessage(response, 'Request failed');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (authData.new_password.length < 8) {
      setFormErrors({ new_password: 'Password must be at least 8 characters' });
      return;
    }
    if (!validatePassword(authData.new_password)) {
      setFormErrors({ new_password: 'Password must contain uppercase, lowercase, and number' });
      return;
    }
    
    setSubmittingForm(true);
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
        addToast('Password reset successful! Please login.', 'success');
        setTimeout(() => {
          setAuthView('login');
          setAuthData({ ...authData, reset_code: '', new_password: '' });
        }, 2000);
      } else {
        const errorMessage = await getErrorMessage(response, 'Reset failed');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const syncTokenWithExtension = (token) => {
    localStorage.setItem('jobroom_token', token);
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setFormErrors({});
    
    if (!validateEmail(authData.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    if (!authData.password) {
      setFormErrors({ password: 'Password is required' });
      return;
    }

    setSubmittingForm(true);
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
        syncTokenWithExtension(data.access_token);
        addToast('Welcome back!', 'success');
      } else {
        const errorMessage = await getErrorMessage(response, 'Login failed');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error. Make sure the backend is running.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setError('');
    
    if (settingsData.password && settingsData.password !== settingsData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (settingsData.password && !validatePassword(settingsData.password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    setSavingSettings(true);
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
        addToast('Profile updated successfully!', 'success');
        setSettingsData({ ...settingsData, password: '', confirm_password: '' });
      } else {
        const errorMessage = await getErrorMessage(response, 'Update failed');
        setError(errorMessage);
      }
    } catch (error) {
      setError('Connection error.');
    } finally {
      setSavingSettings(false);
    }
  };

  const logout = async () => {
    // Call backend to revoke refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch (error) {
        console.error('Error revoking token:', error);
      }
    }
    setToken(null);
    setUser(null);
    setApplications([]);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    addToast('Logged out successfully', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormErrors({});
    
    const errors = validateApplicationForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

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

    setSubmittingForm(true);
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
        const errorMessage = await getErrorMessage(response, 'Error saving application');
        setError(errorMessage);
        return;
      }
      
      fetchApplications();
      resetForm();
      addToast(editingId ? 'Application updated!' : 'Application saved!', 'success');
    } catch (error) {
      console.error('Error:', error);
      setError('Error connecting to server');
    } finally {
      setSubmittingForm(false);
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
    setFormErrors({});
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/applications/${deleteConfirm.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchApplications();
      addToast('Application deleted', 'success');
    } catch (error) {
      console.error('Error deleting application:', error);
      addToast('Failed to delete application', 'error');
    } finally {
      setLoading(false);
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, id: null });
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
    setFormErrors({});
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      setTimeout(() => {
        document.querySelector('input[name="company_name"]')?.focus();
      }, 100);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: undefined });
    }
  };

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthData({ ...authData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: undefined });
    }
  };

  const handleSettingsChange = (e) => {
    setSettingsData({ ...settingsData, [e.target.name]: e.target.value });
  };

  const stats = STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter(app => app.status === status).length;
    return acc;
  }, {});

  const filteredPlatforms = activeRegion === 'all'
    ? JOB_PLATFORMS
    : JOB_PLATFORMS.filter(p => p.region === 'global' || p.region === activeRegion);

  const [showAuth, setShowAuth] = useState(false);
  
  if (!user && !showAuth) {
    return <Landing onGetStarted={() => setShowAuth(true)} />;
  }

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
          
          {error && <div className="error-message" role="alert">{error}</div>}
          
          {authView === 'login' && (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                />
                {formErrors.email && <span id="email-error" className="field-error">{formErrors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  value={authData.password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? 'password-error' : undefined}
                />
                {formErrors.password && <span id="password-error" className="field-error">{formErrors.password}</span>}
              </div>
              <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setAuthView('forgot'); setError(''); setFormErrors({}); }}
                  className="link-button"
                >
                  Forgot Password?
                </button>
              </div>
              <button type="submit" className="auth-btn" disabled={submittingForm}>
                {submittingForm ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {authView === 'register' && (
            <form className="auth-form" onSubmit={handleRegisterInit} noValidate>
              <div className="form-group">
                <label htmlFor="register-name">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  name="full_name"
                  value={authData.full_name}
                  onChange={handleAuthChange}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? 'reg-email-error' : undefined}
                />
                {formErrors.email && <span id="reg-email-error" className="field-error">{formErrors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  name="password"
                  value={authData.password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? 'reg-password-error' : undefined}
                />
                {formErrors.password && <span id="reg-password-error" className="field-error">{formErrors.password}</span>}
              </div>
              <button type="submit" className="auth-btn" disabled={submittingForm}>
                {submittingForm ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {authView === 'verify' && (
            <form className="auth-form" onSubmit={handleRegisterVerify}>
              <div className="form-group">
                <label htmlFor="verify-code">Verification Code</label>
                <input
                  id="verify-code"
                  type="text"
                  name="verification_code"
                  value={authData.verification_code}
                  onChange={handleAuthChange}
                  placeholder="123456"
                  maxLength={6}
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={submittingForm}>
                {submittingForm ? 'Verifying...' : 'Verify & Create Account'}
              </button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={handleResendCode}
                disabled={submittingForm}
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
            <form className="auth-form" onSubmit={handleForgotPassword} noValidate>
              <div className="form-group">
                <label htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? 'forgot-email-error' : undefined}
                />
                {formErrors.email && <span id="forgot-email-error" className="field-error">{formErrors.email}</span>}
              </div>
              <p className="form-hint">
                Enter your email and we'll send you a code to reset your password.
              </p>
              <button type="submit" className="auth-btn" disabled={submittingForm}>
                {submittingForm ? 'Sending...' : 'Send Reset Code'}
              </button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => { setAuthView('login'); setError(''); setFormErrors({}); }}
                style={{ marginTop: '0.5rem' }}
              >
                Back to Login
              </button>
            </form>
          )}

          {authView === 'reset' && (
            <form className="auth-form" onSubmit={handleResetPassword} noValidate>
              <div className="form-group">
                <label htmlFor="reset-code">Reset Code</label>
                <input
                  id="reset-code"
                  type="text"
                  name="reset_code"
                  value={authData.reset_code}
                  onChange={handleAuthChange}
                  placeholder="123456"
                  maxLength={6}
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reset-password">New Password</label>
                <input
                  id="reset-password"
                  type="password"
                  name="new_password"
                  value={authData.new_password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  aria-invalid={!!formErrors.new_password}
                  aria-describedby={formErrors.new_password ? 'new-password-error' : undefined}
                />
                {formErrors.new_password && <span id="new-password-error" className="field-error">{formErrors.new_password}</span>}
              </div>
              <p className="form-hint">
                Password must be at least 8 characters with uppercase, lowercase, and number.
              </p>
              <button type="submit" className="auth-btn" disabled={submittingForm}>
                {submittingForm ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => { setAuthView('login'); setError(''); setFormErrors({}); }}
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
                <button onClick={() => { setAuthView('register'); setError(''); setFormErrors({}); }}>Sign Up</button>
              </>
            )}
            {authView === 'register' && (
              <>
                Already have an account?{' '}
                <button onClick={() => { setAuthView('login'); setError(''); setFormErrors({}); }}>Sign In</button>
              </>
            )}
            <div className="auth-back">
              <button 
                onClick={() => setShowAuth(false)} 
                className="link-button"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Toast Container */}
        <div className="toast-container" aria-live="polite">
          {toasts.map(toast => (
            <Toast 
              key={toast.id} 
              message={toast.message} 
              type={toast.type} 
              onClose={() => removeToast(toast.id)} 
            />
          ))}
        </div>

        <header className="app-header">
          <div className="logo">
            <h1>JobRoom</h1>
          </div>
          <div className="user-menu">
            <button 
              className="btn-secondary btn-sm theme-toggle" 
              onClick={() => setDarkMode(!darkMode)} 
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="user-info">
              <div className="user-name">{user.full_name || 'User'}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <button 
              className="btn-secondary btn-sm" 
              onClick={() => setShowSettings(true)} 
              title="Settings"
              aria-label="Open settings"
            >
              ⚙️ <span className="btn-text">Settings</span>
            </button>
            <button 
              className="btn-logout" 
              onClick={logout} 
              title="Logout"
              aria-label="Logout"
            >
              🚪 <span className="btn-text">Logout</span>
            </button>
          </div>
        </header>

        <main className="main-content">
          {fetchingUser && !applications.length ? (
            <LoadingSkeleton />
          ) : (
            <>
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

              <div className="content-card">
                <div className="card-header">
                  <h2>Applications {applications.length > 0 && `(${applications.length})`}</h2>
                  <button 
                    className="btn-primary" 
                    onClick={toggleForm}
                    aria-expanded={showForm}
                    aria-controls="application-form"
                  >
                    {showForm ? 'Cancel' : '+ Add Application'}
                  </button>
                </div>

                {showForm && (
                  <div className="form-panel" id="application-form">
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <form onSubmit={handleSubmit} noValidate>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="company_name">Company Name *</label>
                          <input
                            id="company_name"
                            type="text"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            required
                            aria-invalid={!!formErrors.company_name}
                            aria-describedby={formErrors.company_name ? 'company-error' : undefined}
                          />
                          {formErrors.company_name && <span id="company-error" className="field-error">{formErrors.company_name}</span>}
                        </div>
                        <div className="form-group">
                          <label htmlFor="position_title">Position Title *</label>
                          <input
                            id="position_title"
                            type="text"
                            name="position_title"
                            value={formData.position_title}
                            onChange={handleChange}
                            required
                            aria-invalid={!!formErrors.position_title}
                            aria-describedby={formErrors.position_title ? 'position-error' : undefined}
                          />
                          {formErrors.position_title && <span id="position-error" className="field-error">{formErrors.position_title}</span>}
                        </div>
                        <div className="form-group">
                          <label htmlFor="status">Status</label>
                          <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                          >
                            {STATUSES.map(s => (
                              <option key={s} value={s}>{getStatusLabel(s)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="job_url">Job URL</label>
                          <input
                            id="job_url"
                            type="url"
                            name="job_url"
                            value={formData.job_url}
                            onChange={handleChange}
                            aria-invalid={!!formErrors.job_url}
                            aria-describedby={formErrors.job_url ? 'url-error' : undefined}
                          />
                          {formErrors.job_url && <span id="url-error" className="field-error">{formErrors.job_url}</span>}
                        </div>
                        <div className="form-group">
                          <label htmlFor="location">Location</label>
                          <input
                            id="location"
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="salary_range">Salary Range</label>
                          <input
                            id="salary_range"
                            type="text"
                            name="salary_range"
                            value={formData.salary_range}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="date_applied">Date Applied</label>
                          <input
                            id="date_applied"
                            type="date"
                            name="date_applied"
                            value={formData.date_applied}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact_name">Contact Name</label>
                          <input
                            id="contact_name"
                            type="text"
                            name="contact_name"
                            value={formData.contact_name}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact_email">Contact Email</label>
                          <input
                            id="contact_email"
                            type="email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            aria-invalid={!!formErrors.contact_email}
                            aria-describedby={formErrors.contact_email ? 'contact-email-error' : undefined}
                          />
                          {formErrors.contact_email && <span id="contact-email-error" className="field-error">{formErrors.contact_email}</span>}
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label htmlFor="notes">Notes</label>
                          <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary" disabled={submittingForm}>
                          {submittingForm ? 'Saving...' : editingId ? 'Update' : 'Save'} Application
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
                                {getStatusLabel(app.status)}
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

              {/* Job Platforms Section - Added to authenticated view */}
              <div className="content-card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                  <h2>Browse Top Job Platforms</h2>
                </div>
                <div className="form-panel" style={{ padding: '1rem' }}>
                  <div className="region-filters" role="group" aria-label="Filter platforms by region">
                    {REGIONS.map(region => (
                      <button
                        key={region.id}
                        className={`region-filter ${activeRegion === region.id ? 'active' : ''}`}
                        onClick={() => setActiveRegion(region.id)}
                        aria-pressed={activeRegion === region.id}
                      >
                        {region.label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="platforms-grid">
                    {filteredPlatforms.map(platform => (
                      <a
                        key={platform.name}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="platform-card"
                      >
                        <div className="platform-logo" style={{ background: platform.color }} aria-hidden="true">
                          {platform.initials}
                        </div>
                        <div className="platform-info">
                          <h3>{platform.name}</h3>
                          <span className="platform-link">Browse Jobs →</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

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
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} JobRoom. All rights reserved.</p>
            <p>Track your job applications with style.</p>
          </div>
        </footer>

        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-title">
              <div className="modal-header">
                <h2 id="settings-title">Settings</h2>
                <button className="btn-close" onClick={() => setShowSettings(false)} aria-label="Close settings">×</button>
              </div>
              
              {error && <div className="error-message" role="alert">{error}</div>}
              
              <form className="settings-form" onSubmit={handleSettingsSave}>
                <div className="form-group">
                  <label htmlFor="settings-name">Full Name</label>
                  <input
                    id="settings-name"
                    type="text"
                    name="full_name"
                    value={settingsData.full_name}
                    onChange={handleSettingsChange}
                    placeholder="Your name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settings-email">Email</label>
                  <input
                    id="settings-email"
                    type="email"
                    value={user.email}
                    disabled
                    className="disabled-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settings-phone">Phone</label>
                  <input
                    id="settings-phone"
                    type="tel"
                    name="phone"
                    value={settingsData.phone}
                    onChange={handleSettingsChange}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settings-bio">Bio</label>
                  <textarea
                    id="settings-bio"
                    name="bio"
                    value={settingsData.bio}
                    onChange={handleSettingsChange}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <hr className="divider" />
                <div className="form-group">
                  <label htmlFor="settings-password">New Password (leave empty to keep current)</label>
                  <input
                    id="settings-password"
                    type="password"
                    name="password"
                    value={settingsData.password}
                    onChange={handleSettingsChange}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settings-confirm-password">Confirm New Password</label>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    name="confirm_password"
                    value={settingsData.confirm_password}
                    onChange={handleSettingsChange}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLegal && (
          <div className="modal-overlay legal-modal" onClick={() => setShowLegal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="legal-title">
              <div className="modal-header">
                <h2 id="legal-title">
                  {showLegal === 'privacy' && 'Privacy Policy'}
                  {showLegal === 'terms' && 'Terms of Service'}
                  {showLegal === 'cookies' && 'Cookie Policy'}
                  {showLegal === 'legal' && 'Legal Notice'}
                  {showLegal === 'faq' && 'FAQ'}
                </h2>
                <button className="btn-close" onClick={() => setShowLegal(null)} aria-label="Close dialog">×</button>
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

        {deleteConfirm.isOpen && (
          <ConfirmModal
            isOpen={deleteConfirm.isOpen}
            title="Delete Application"
            message="Are you sure you want to delete this application? This action cannot be undone."
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
            confirmText="Delete"
            confirmVariant="danger"
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
