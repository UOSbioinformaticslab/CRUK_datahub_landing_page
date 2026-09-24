import React, { useState, useEffect } from 'react';

export const DatahubDashboard = () => {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [showChatbotBanner, setShowChatbotBanner] = useState(() => {
    return localStorage.getItem('hideAiBanner') !== 'true';
  });

  useEffect(() => {
    if (!showChatbotBanner) return;
    const hideBanner = () => setShowChatbotBanner(false);
    
    // Slight delay to prevent immediate dismissal on navigation click
    const timeout = setTimeout(() => {
      document.addEventListener('click', hideBanner);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', hideBanner);
    };
  }, [showChatbotBanner]);

  const handleNeverShowAgain = (e) => {
    e.stopPropagation(); // Stop the click from bubbling up and just dismissing
    localStorage.setItem('hideAiBanner', 'true');
    setShowChatbotBanner(false);
  };

  const containerStyle = {
    backgroundColor: '#f0f7ff',
    maxWidth: '90%',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    color: '#003580',
    fontSize: '1.25rem',
    boxSizing: 'border-box',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  };

  const heroSectionStyle = {
    position: 'relative',
    width: '100%',
    height: '450px',
    backgroundImage: 'url("../scientist.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: '8px',
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center'
  };

  const insetBoxStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '40px',
    marginLeft: '5%',
    maxWidth: '500px',
    borderRadius: '4px',
    boxShadow: '0 2px 15px rgba(0,0,0,0.1)',
    borderLeft: '6px solid #e40085'
  };

  const headingStyle = {
    margin: '0 0 16px 0',
    fontSize: '2.4rem',
    color: '#003580',
    lineHeight: '1.1'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px'
  };

  const buttonStyle = {
    backgroundColor: '#ffffff',
    color: '#003580',
    border: '1px solid #d1d1d1',
    padding: '20px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '1.2rem',
    textAlign: 'center',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    display: 'block'
  };

  const focusSectionStyle = {
    marginTop: '40px'
  };

  // Updated CTA Styles
  const ctaContainerStyle = {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    borderRadius: '4px',
    border: '1px solid #d1d1d1',
    backgroundColor: '#ffffff',
    textDecoration: 'none',
    overflow: 'hidden',
    minHeight: '140px',
    transition: 'all 0.2s ease'
  };

  const ctaImageStyle = {
    width: '25%',
    backgroundImage: 'url("../crh.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  const ctaTextStyle = {
    width: '75%',
    color: '#003580',
    padding: '20px',
    fontSize: '1.2rem',
    textAlign: 'center',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  };

  return (
    <div style={containerStyle}>
      {/* Chatbot Alert Banner */}
      {showChatbotBanner && (
        <div 
          onClick={() => setShowChatbotBanner(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            cursor: 'pointer'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#003580',
            padding: '40px 10vw',
            width: '150vw',
            textAlign: 'center',
            transform: 'rotate(-10deg)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            borderTop: '10px solid #e40085',
            borderBottom: '10px solid #e40085'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '3.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: '#e40085' }}>
              ✨ New Feature: AI Analytics Chatbot! ✨
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '1.8rem', lineHeight: '1.4', fontWeight: 'bold' }}>
              We've launched a new AI chatbot to help you query datasets and projects. Look for the <span style={{ color: '#e40085' }}>pink</span> chat icon in the bottom right!
            </p>
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'normal', color: '#666' }}>
              (click anywhere to dismiss)
            </p>
            <button 
              onClick={handleNeverShowAgain}
              style={{
                marginTop: '12px',
                background: 'transparent',
                border: 'none',
                color: '#e40085',
                textDecoration: 'underline',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Don't show this again
            </button>
          </div>
        </div>
      )}

      {/* Promotional Banner */}
      {isBannerVisible && (
        <div style={{
          backgroundColor: '#003580',
          color: '#ffffff',
          padding: '16px 24px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#e40085' }}>Funded by CRUK? Showcase your data.</h3>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>
              Join the researchers making their metadata discoverable in three easy steps: <br />
              1) <a href="#" style={{ color: '#ffcc00', textDecoration: 'underline', fontWeight: 'bold' }}>Register your email</a>. 
              2) Register your team
              3) Upload your metadata using quick AI tools.
            </p>
          </div>
          <button 
            onClick={() => setIsBannerVisible(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              marginLeft: '16px',
              opacity: 0.8
            }}
            aria-label="Dismiss banner"
          >
            &times;
          </button>
        </div>
      )}

      {/* Hero Section with Inset Strapline */}
      <div style={heroSectionStyle}>
        <div style={insetBoxStyle}>
          <h1 style={headingStyle}>What would you like to find today?</h1>
          <p>
            Welcome to the CRUK Data Hub, your gateway to data produced by research funded through Cancer Research UK
          </p>
        </div>
      </div>

      {/* Navigation Grid */}
      <div style={gridStyle}>
        <a href="./datasets.html" id="browse-datasets-btn" data-tour="browse-datasets" style={buttonStyle}>Browse or Search Datasets</a>
        <a href="./projects.html" style={buttonStyle}>Browse or Search Projects</a>
        <a href="./publications.html" style={buttonStyle}>Browse or Search Associated Publications</a>
        <a href="./tools.html" style={buttonStyle}>Browse or Search Associated Tools</a>
      </div>

      {/* Research Focus Section */}
      <div style={focusSectionStyle}>
        <a href="./horizons.html" style={ctaContainerStyle}>
          <div style={ctaImageStyle} aria-hidden="true"></div>
          <div style={ctaTextStyle}>
            Explore Cancer Research Horizons Data Resources
          </div>
        </a>
        <a href="./data_custodians.html" style={{...ctaContainerStyle, marginTop: '20px'}}>
          <div style={{...ctaTextStyle, width: '100%', textAlign: 'center'}}>
            Meet our Data Custodians
          </div>
        </a>
      </div>
    </div>
  );
};