#!/usr/bin/env python3
"""Local dev server for SAR Tracker.

Same as `python -m http.server`, but sends no-store headers so the browser
always picks up edits to app.js / styles.css. Without this the browser caches
app.js indefinitely and a hard refresh (Ctrl+Shift+R) is needed after every
change -- which silently shows stale results.

    python serve.py            # http://localhost:8080
    python serve.py 8081       # different port
"""

from __future__ import annotations

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        # Keep the console quiet; only surface errors.
        if not str(args[1] if len(args) > 1 else "").startswith("2"):
            super().log_message(fmt, *args)


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = partial(NoCacheHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("", port), handler) as httpd:
        print(f"SAR Tracker dev server (no-cache) -> http://localhost:{port}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
