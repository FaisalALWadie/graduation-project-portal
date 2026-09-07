"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself (not just its
// children), so it must render its own <html>/<body> - it replaces the
// entire root layout when triggered.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ color: "#71717a", maxWidth: "28rem" }}>
            The application failed to load. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "#18181b",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
