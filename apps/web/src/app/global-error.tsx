"use client";

// Last-resort boundary (replaces the root layout), so styles are inline.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#F6F4EF",
          color: "#1C1F23",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 420, padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Ajaia Docs ran into a problem</h1>
          <p style={{ color: "#5B616B", fontSize: 15, marginTop: 8 }}>Please try again. Saved work is not affected.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              height: 36,
              padding: "0 14px",
              borderRadius: 10,
              border: 0,
              background: "#2E5E4E",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
