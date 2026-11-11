import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const FloatingQRCode = () => {
  const [mounted, setMounted] = useState(false);
  // Initially show in its closed form, rather than open
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') return null;

  const handleOpen = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsOpen(true);
  };

  const handleClose = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsOpen(false);
  };

  // Initially / when closed: render the compact floating Feedback button
  if (!isOpen) {
    return createPortal(
      <button
        type="button"
        onClick={handleOpen}
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          backgroundColor: '#00468C',
          color: '#ffffff',
          border: '2px solid #ffffff',
          borderRadius: '24px',
          padding: '8px 18px',
          fontSize: '13px',
          fontWeight: '700',
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'transform 0.15s ease, background-color 0.15s ease',
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#003366';
          e.currentTarget.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#00468C';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Open Feedback Form"
        aria-label="Open Feedback Form"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Feedback</span>
      </button>,
      document.body
    );
  }

  // Expanded embedded Google Form element
  const widget = (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: 'min(640px, calc(100vw - 32px))',
        height: 'min(820px, calc(100vh - 40px))',
        zIndex: 99999,
        pointerEvents: 'auto',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.28), 0 2px 10px rgba(0, 0, 0, 0.15)',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: '#00468C',
          color: '#ffffff',
          userSelect: 'none',
          borderBottom: '1px solid #003366',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '0.2px' }}>
            Feedback on the CRUK Metadata Hub
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: '1.2',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
          }}
          title="Close feedback form"
          aria-label="Close feedback form"
        >
          <span>✕</span>
          <span>Close</span>
        </button>
      </div>

      {/* Embedded Google Form iframe */}
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLSd9UkWFjj2s9Wwioi3Xghyb0ua8X5-3SnqsWp3ycqxCbMf7GQ/viewform?embedded=true"
        width="100%"
        height="100%"
        frameBorder="0"
        marginHeight="0"
        marginWidth="0"
        title="Feedback on the CRUK Metadata Hub"
        style={{
          display: 'block',
          border: 'none',
          width: '100%',
          height: '100%',
          flex: 1,
          backgroundColor: '#ffffff'
        }}
      >
        Loading…
      </iframe>
    </div>
  );

  return createPortal(widget, document.body);
};

export default FloatingQRCode;
