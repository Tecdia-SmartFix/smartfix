import React, { useRef, useEffect, useCallback } from 'react';

const ChromaKeyVideo = ({ src, width, height, className = '' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = frame.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Detect green-screen pixels: green channel dominant
      if (g > 80 && g > r * 1.25 && g > b * 1.25) {
        d[i + 3] = 0; // make transparent
      }
    }

    ctx.putImageData(frame, 0, 0);
    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const start = () => {
      rafRef.current = requestAnimationFrame(processFrame);
    };
    video.addEventListener('play', start);

    return () => {
      video.removeEventListener('play', start);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [processFrame]);

  return (
    <div className={className} style={{ width, height }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default ChromaKeyVideo;
