'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LOADING_STEPS = [
  'Setting up your workspace...',
  'Preparing dashboard...',
  'Loading experiments...',
  'Almost ready...',
];

export default function LoadingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Cycle through loading steps
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    // Redirect after animation
    const redirectTimeout = setTimeout(() => {
      router.push('/dashboard');
    }, 2800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(redirectTimeout);
    };
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#ffffff' }}
    >
      <div className="text-center animate-fade-in" style={{ width: '320px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#c45c5c',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase',
            }}
          >
            JIGYASU
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              letterSpacing: '1.5px',
              fontWeight: 500,
              marginTop: '4px',
            }}
          >
            Engineering Design
          </p>
        </div>

        {/* Status text */}
        <p
          className="animate-pulse-subtle"
          style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px',
            fontWeight: 500,
            minHeight: '22px',
          }}
        >
          {LOADING_STEPS[stepIndex]}
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #c45c5c, #e07a7a)',
              borderRadius: '4px',
              transition: 'width 0.1s ease-out',
            }}
          />
        </div>

        {/* Sub-step text */}
        <p
          style={{
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          {LOADING_STEPS[stepIndex]}
        </p>
      </div>
    </div>
  );
}
