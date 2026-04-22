import React from 'react';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Crop Insurance System</h3>
            <p>Smart Contract-Based Automated Insurance for Farmers</p>
            <p className="footer-pmfby">Based on PMFBY Guidelines</p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/register">Register</a></li>
              <li><a href="/create-policy">Create Policy</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>Double Verification System</li>
              <li>Instant Payouts (2-3 sec)</li>
              <li>ML-Based Risk Assessment</li>
              <li>Blockchain Transparency</li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-icons">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <FaGithub />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                <FaLinkedin />
              </a>
              <a href="mailto:contact@cropinsurance.com">
                <FaEnvelope />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Crop Insurance System. Final Year Project - CH.EN.U4CSE22026</p>
          <p>Developed by Jishnu S | Computer Science & Engineering</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
