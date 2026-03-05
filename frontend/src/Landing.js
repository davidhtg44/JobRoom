import React from 'react';
import './Landing.css';

function Landing({ onGetStarted }) {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">JobRoom</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="https://github.com/davidhtg44/JobRoom" target="_blank" rel="noopener noreferrer">GitHub</a>
            <button className="btn btn-nav" onClick={onGetStarted}>Sign In</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Track Your Job Search
            <span className="highlight"> Like a Pro</span>
          </h1>
          <p className="hero-subtitle">
            The professional way to manage job applications. 
            Organize your search, track every application, and land your dream job faster.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Get Started Free
            </button>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              Learn More ↓
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Free</span>
            </div>
            <div className="stat">
              <span className="stat-number">Secure</span>
              <span className="stat-label">Your Data</span>
            </div>
            <div className="stat">
              <span className="stat-number">Chrome</span>
              <span className="stat-label">Extension</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-mockup">
            <div className="mockup-header">
              <div className="mockup-dot red"></div>
              <div className="mockup-dot yellow"></div>
              <div className="mockup-dot green"></div>
            </div>
            <div className="mockup-content">
              <div className="mockup-row">
                <div className="mockup-col company">
                  <div className="mockup-label">Company</div>
                  <div className="mockup-value">Google</div>
                </div>
                <div className="mockup-col position">
                  <div className="mockup-label">Position</div>
                  <div className="mockup-value">Software Engineer</div>
                </div>
                <div className="mockup-col status">
                  <div className="mockup-label">Status</div>
                  <div className="mockup-badge">Interview</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-container">
          <h2 className="section-title">Everything You Need</h2>
          <p className="section-subtitle">Powerful features to streamline your job search</p>
          
          <div className="features-grid">
            <div className="feature-card">
              <h3>Dashboard Analytics</h3>
              <p>Track your application pipeline with real-time statistics and insights.</p>
            </div>
            
            <div className="feature-card">
              <h3>Chrome Extension</h3>
              <p>Auto-extract job details from LinkedIn, Indeed, and 10+ job boards instantly.</p>
            </div>
            
            <div className="feature-card">
              <h3>Secure & Private</h3>
              <p>Your data is encrypted and stored securely. Only you can access it.</p>
            </div>
            
            <div className="feature-card">
              <h3>Email Verification</h3>
              <p>Secure account creation with email verification codes.</p>
            </div>
            
            <div className="feature-card">
              <h3>Rich Profiles</h3>
              <p>Store company info, contacts, salary ranges, and personal notes.</p>
            </div>
            
            <div className="feature-card">
              <h3>Fully Responsive</h3>
              <p>Access your applications from any device, anywhere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="section-container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Start tracking in three simple steps</p>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create Account</h3>
                <p>Sign up with your email in seconds. No credit card required.</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Add Applications</h3>
                <p>Use our Chrome extension to auto-save jobs or add manually.</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Track Progress</h3>
                <p>Monitor your pipeline from applied to interview to offer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Land Your Dream Job?</h2>
          <p>Join professionals who organize their job search with JobRoom.</p>
          <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
            Start Tracking Now — It's Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="nav-logo">
              <span className="logo-text">JobRoom</span>
            </div>
            <p>Track your job applications with style.</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="https://github.com/davidhtg44/JobRoom" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
            
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); onGetStarted(); }}>Privacy</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onGetStarted(); }}>Terms</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onGetStarted(); }}>Cookies</a>
            </div>
            
            <div className="footer-column">
              <h4>Connect</h4>
              <a href="mailto:jobroom.info@gmail.com">Contact</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onGetStarted(); }}>Support</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} JobRoom. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
