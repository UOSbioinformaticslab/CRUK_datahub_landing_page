import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import feedbackQrCode from './feedback.png';

const FloatingQRCode = () => {
  const [mounted, setMounted] = useState(false);
  const [isClosed, setIsClosed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('feedbackWidgetClosed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isClosed || typeof window === 'undefined') return null;

  const widget = (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '85px',
        height: '100px',
        zIndex: 99999,
        pointerEvents: 'auto',
        backgroundColor: '#ffffff',
        padding: '6px',
        borderRadius: '12px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsClosed(true);
          sessionStorage.setItem('feedbackWidgetClosed', 'true');
        }}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#dc2626',
          color: '#ffffff',
          border: '2px solid #ffffff',
          fontSize: '11px',
          fontWeight: 'bold',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
          zIndex: 100000
        }}
        title="Close feedback button"
        aria-label="Close feedback button"
      >
        ✕
      </button>

      <a
        href="https://bit.ly/43uTQOM"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <img
          src={feedbackQrCode}
          alt="Feedback QR Code"
          style={{ width: '70px', height: '70px', display: 'block', borderRadius: '4px' }}
        />
        <span
          style={{
            fontSize: '9px',
            fontFamily: 'sans-serif',
            color: '#00468C',
            fontWeight: 'bold',
            marginTop: '2px',
            textAlign: 'center'
          }}
        >
          Feedback
        </span>
      </a>
    </div>
  );

  return createPortal(widget, document.body);
};


export default FloatingQRCode;