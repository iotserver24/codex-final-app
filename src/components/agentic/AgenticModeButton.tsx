import React, { useState } from "react";
// import { AgenticModeInterface } from './AgenticModeInterface';

export const AgenticModeButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: "#1a1a1a",
        }}
      >
        <div style={{ padding: "20px", color: "white" }}>
          <h2>🤖 Agentic Mode</h2>
          <p>Autonomous AI agent implementation coming soon...</p>
        </div>
        <button
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            border: "none",
            background: "#333",
            color: "#fff",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
          }}
          onClick={() => setIsOpen(false)}
          title="Close Agentic Mode"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      style={{
        padding: "8px 16px",
        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s",
        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
      }}
      title="Open Agentic Mode - Autonomous AI Agent"
    >
      🤖 Agentic Mode
    </button>
  );
};
