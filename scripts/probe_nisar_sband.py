#!/usr/bin/env python3
"""Probe where NISAR S-band data can actually be fetched from.

Taiwan is blocked from Bhoonidhi (connections time out), so this runs on a
GitHub Actions runner instead and reports what that network can reach:

  1. ASF  — confirm whether the L-band DAAC has started serving S-SAR. Today it
            does not; the fetch pipeline depends on that being true.
  2. Bhoonidhi — reachability of the STAC API, unauthenticated and (when
            BHOONIDHI_TOKEN is in the environment) authenticated.

Read-only: it issues GET requests and prints what it finds. Stdlib only, to
match fetch_sar_data.py.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter

TIMEOUT = 45
TOKEN = os.environ.get("BHOONIDHI_TOKEN", "").strip()
BHOONIDHI_API = os.environ.get("BHOONIDHI_API", "https://bhoonidhi-api.nrsc.gov.in/data").rstrip("/")
# Same tracks the pipeline fetches; a window wide enough to include ISRO's
# Cycle 25 S-band release (from 8 Jul 2026).
ASF_PROBES = (("ASCENDING", "39", "13-14"), ("DESCENDING", "133", "76-78"))
START, END = "2026-06-01T00:00:00Z", "2026-12-31T00:00:00Z"


def post(url: str, body: dict, headers: dict[str, str] | None = None) -> tuple[int, str]:
    """(status, body) for a JSON POST. Never raises."""
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "User-Agent": "sar-tracker-probe/1.0",
            "Content-Type": "application/json",
            **(headers or {}),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")[:400]
    except Exception as exc:
        return 0, f"{type(exc).__name__}: {exc}"


def get(url: str, headers: dict[str, str] | None = None) -> tuple[int, str]:
    """(status, body). Network and HTTP errors are reported, never raised."""
    request = urllib.request.Request(
        url, headers={"User-Agent": "sar-tracker-probe/1.0", **(headers or {})}
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")[:400]
    except Exception as exc:                      # DNS, TLS, timeout, reset
        return 0, f"{type(exc).__name__}: {exc}"


def probe_asf() -> bool:
    print("\n=== ASF: is any NISAR S-SAR published? ===")
    found_s = False
    for direction, orbit, frames in ASF_PROBES:
        url = "https://api.daac.asf.alaska.edu/services/search/param?" + urllib.parse.urlencode({
            "dataset": "NISAR", "output": "geojson", "maxresults": 2000,
            "start": START, "end": END,
            "flightDirection": direction, "relativeOrbit": orbit, "frame": frames,
        })
        status, body = get(url)
        if status != 200:
            print(f"  T{orbit} {direction}: HTTP {status} — {body[:160]}")
            continue
        features = json.loads(body).get("features", [])
        sensors = Counter(f.get("properties", {}).get("sensor") for f in features)
        print(f"  T{orbit} {direction}: {len(features)} granules, sensors={dict(sensors)}")
        found_s = found_s or any("S" == str(s or "")[:1].upper() for s in sensors)
    print(f"  -> S-band on ASF: {'YES' if found_s else 'no'}")
    return found_s


def probe_bhoonidhi() -> None:
    print(f"\n=== Bhoonidhi: {BHOONIDHI_API} ===")
    auth = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else None
    print(f"  token in env: {'yes' if TOKEN else 'no'}")

    # A reachable host is the first thing to establish: from Taiwan the
    # connection times out, so a 401 here is already useful news.
    status, body = get(BHOONIDHI_API + "/collections")
    print(f"  GET /collections (anon): {status or 'unreachable'} — {body[:200]}")
    if auth:
        status, body = get(BHOONIDHI_API + "/collections", auth)
        print(f"  GET /collections (auth): {status or 'unreachable'} — {body[:300]}")

    # STAC item search is a POST; a bbox over Taiwan and the S-band cycle window.
    search_body = {
        "bbox": [118.0, 20.0, 124.0, 27.5],
        "datetime": f"{START}/{END}",
        "limit": 5,
    }
    status, body = post(BHOONIDHI_API + "/search", search_body)
    print(f"  POST /search (anon): {status or 'unreachable'} — {body[:200]}")
    if auth:
        status, body = post(BHOONIDHI_API + "/search", search_body, auth)
        print(f"  POST /search (auth): {status or 'unreachable'} — {body[:600]}")
    if not TOKEN:
        print("  -> no token: get one from POST /auth/token (registered Bhoonidhi")
        print("     account) and store it as the BHOONIDHI_TOKEN repo secret")


def main() -> int:
    probe_asf()
    probe_bhoonidhi()
    print("\nDone. Nothing was written or downloaded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
