import React, { useEffect } from 'react';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';

// Small bottom-right confirmation that an export was saved. The File System
// Access API (used by showSaveFilePicker) bypasses the browser's download
// manager, so neither the download tray nor the browser's download history
// fire — this fills that gap with a clear in-app "saved" cue.
//
// `saved` is either null (nothing to show) or { name, blob }. The blob lets
// us open the file in a new tab on click; PDFs render inline, .xlsx files
// trigger a save dialog (browser can't preview spreadsheets).
const DownloadToast = ({ saved, onDismiss, autoDismissMs = 8000 }) => {
  useEffect(() => {
    if (!saved || !autoDismissMs) return;
    const id = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(id);
  }, [saved, autoDismissMs, onDismiss]);

  if (!saved) return null;
  const { name, blob } = saved;

  const handleOpen = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // Some browsers block window.open without user activation; this fires
    // from a direct button click so it's fine.
    window.open(url, '_blank', 'noopener,noreferrer');
    // Hold the URL long enough for the new tab to load (~1 min), then free it.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: '#ffffff',
        border: '1px solid #b6e6cf',
        borderRadius: 6,
        boxShadow: '0 10px 30px rgba(15, 28, 63, 0.16)',
        fontFamily: "'Inter', sans-serif",
        minWidth: 320,
        maxWidth: 420,
        animation: 'dl-toast-in 0.18s ease-out',
      }}
    >
      <style>{`
        @keyframes dl-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .dl-toast-open:hover { background: #ecfdf5 !important; border-color: #10b981 !important; color: #047857 !important; }
      `}</style>
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#10b981',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CheckCircle2 size={18} strokeWidth={2.6} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#0f8657',
          }}
        >
          Download saved
        </div>
        <div
          title={name}
          style={{
            marginTop: 2,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: '#0f1c3f',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
      </div>
      <button
        onClick={handleOpen}
        className="dl-toast-open"
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          border: '1px solid #b6e6cf',
          background: '#f0fdf4',
          color: '#0f8657',
          cursor: 'pointer',
          borderRadius: 4,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <ExternalLink size={12} strokeWidth={2.6} />
        Open
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          color: '#6b7280',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default DownloadToast;
