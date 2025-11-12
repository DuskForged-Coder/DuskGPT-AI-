
import React from 'react';

export const AudioIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22a2 2 0 0 0 2-2v-4a2 2 0 0 0-4 0v4a2 2 0 0 0 2 2Z"></path>
    <path d="M6 12v-2a6 6 0 0 1 12 0v2"></path>
    <path d="M12 18v-8"></path>
    <path d="M8.5 10a.5.5 0 1 0-1 0v4a.5.5 0 1 0 1 0Z"></path>
    <path d="M12 10h.01"></path>
    <path d="M15.5 10a.5.5 0 1 0-1 0v4a.5.5 0 1 0 1 0Z"></path>
  </svg>
);
