import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000/api';

const STATUSES = ['wanted', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

function App() {
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/applications`);
      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId
      ? `${API_URL}/applications/${editingId}`
      : `${API_URL}/applications`;
    const method = editingId ? 'PUT' : 'POST';

    const submitData = { ...formData };
    // Remove empty fields that backend doesn't accept
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

    console.log('Saving to:', url);
    console.log('Data:', submitData);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        alert('Error saving: ' + errorText);
        return;
      }
      
      const result = await response.json();
      console.log('Saved successfully:', result);
      fetchApplications();
      resetForm();
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error connecting to server. Make sure backend is running on port 8000.');
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
        await fetch(`${API_URL}/applications/${id}`, { method: 'DELETE' });
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

  // Calculate stats
  const stats = STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter(app => app.status === status).length;
    return acc;
  }, {});

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1>
          <span className="icon">🚀</span>
          JobRoom
        </h1>
        <p>Track your job applications with style</p>
      </header>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card" style={{ animationDelay: '0ms' }}>
          <div className="stat-number">{applications.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '100ms' }}>
          <div className="stat-number">{stats.wanted}</div>
          <div className="stat-label">Wanted</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '200ms' }}>
          <div className="stat-number">{stats.applied}</div>
          <div className="stat-label">Applied</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '300ms' }}>
          <div className="stat-number">{stats.interview}</div>
          <div className="stat-label">Interview</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '400ms' }}>
          <div className="stat-number">{stats.offer}</div>
          <div className="stat-label">Offers</div>
        </div>
      </div>

      {/* Main Card */}
      <div className="main-card">
        <div className="card-header-custom">
          <h5>
            <span>📋</span> Applications
            <span style={{ color: '#667eea', marginLeft: '0.5rem' }}>
              ({applications.length})
            </span>
          </h5>
          <button
            className="btn btn-add"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Cancel' : '+ Add Application'}
          </button>
        </div>

        {showForm && (
          <div className="form-section">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="e.g., Google"
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Position Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="position_title"
                    value={formData.position_title}
                    onChange={handleChange}
                    placeholder="e.g., Senior Software Engineer"
                    required
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Job URL</label>
                  <input
                    type="url"
                    className="form-control"
                    name="job_url"
                    value={formData.job_url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s === 'wanted' && '💭 '}
                        {s === 'applied' && '📤 '}
                        {s === 'interview' && '🎯 '}
                        {s === 'offer' && '🎉 '}
                        {s === 'rejected' && '❌ '}
                        {s === 'withdrawn' && '👋 '}
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Date Applied</label>
                  <input
                    type="date"
                    className="form-control"
                    name="date_applied"
                    value={formData.date_applied}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-control"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Salary Range</label>
                  <input
                    type="text"
                    className="form-control"
                    name="salary_range"
                    value={formData.salary_range}
                    onChange={handleChange}
                    placeholder="e.g., $150k - $200k"
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Contact Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    placeholder="Recruiter name"
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="recruiter@company.com"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Quick notes..."
                  />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-add">
                  {editingId ? '💾 Update Application' : '✨ Save Application'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                  style={{ 
                    background: '#6c757d', 
                    border: 'none', 
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Applications Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Position</th>
                <th>Status</th>
                <th>Location</th>
                <th>Applied</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <div className="empty-state-icon">📭</div>
                      <p className="empty-state-text">
                        No applications yet. Click <strong>"+ Add Application"</strong> to get started!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app, index) => (
                  <tr key={app.id} style={{ animationDelay: `${index * 50}ms` }}>
                    <td data-label="Company" className="company-cell">
                      <span className="company-name">{app.company_name}</span>
                      {app.job_url && (
                        <a 
                          href={app.job_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="job-link"
                        >
                          🔗 View Job
                        </a>
                      )}
                    </td>
                    <td data-label="Position">
                      <strong>{app.position_title}</strong>
                    </td>
                    <td data-label="Status">
                      <span className={`badge badge-${app.status}`}>
                        {app.status === 'wanted' && '💭 '}
                        {app.status === 'applied' && '📤 '}
                        {app.status === 'interview' && '🎯 '}
                        {app.status === 'offer' && '🎉 '}
                        {app.status === 'rejected' && '❌ '}
                        {app.status === 'withdrawn' && '👋 '}
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td data-label="Location">
                      {app.location || <span style={{ color: '#cbd5e0' }}>—</span>}
                    </td>
                    <td data-label="Applied">
                      {app.date_applied 
                        ? new Date(app.date_applied).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : <span style={{ color: '#cbd5e0' }}>—</span>
                      }
                    </td>
                    <td data-label="Notes">
                      <small style={{ color: '#718096' }}>
                        {app.notes 
                          ? app.notes.length > 40 
                            ? app.notes.substring(0, 40) + '...' 
                            : app.notes 
                          : '—'
                        }
                      </small>
                    </td>
                    <td data-label="Actions">
                      <button
                        className="btn btn-action btn-edit me-2"
                        onClick={() => handleEdit(app)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-action btn-delete"
                        onClick={() => handleDelete(app.id)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
