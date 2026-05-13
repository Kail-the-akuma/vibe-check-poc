import React from 'react';

const MyComponent = ({ unsafeData }) => {
  const apiKey = "sk-ant-1234567890abcdef1234567890abcdef"; // EXPOSED KEY!

  return (
    <div>
      <h1>Security Vibe Test</h1>
      {/* POTENTIAL XSS */}
      <div dangerouslySetInnerHTML={{ __html: unsafeData }} />
    </div>
  );
};

export default MyComponent;
