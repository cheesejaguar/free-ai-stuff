#!/usr/bin/env bash
# Unit tests for the Shabbat guard. Covers PST and PDT edges, including a DST date.
# Fri 15:59 vs 16:00, Sat 21:29 vs 21:30. Exit 0 on success, 1 on failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
GUARD="${ROOT}/guard.sh"
fail=0
ran=0

expect() {
  local now="$1" want="$2" label="$3"
  ran=$((ran + 1))
  local out
  out="$(SHABBAT_GUARD_NOW="$now" bash "$GUARD")"
  local got
  got="$(printf '%s\n' "$out" | awk -F= '/^proceed=/{print $2}' | tail -n1)"
  # Confirm the test clock actually landed on the intended weekday/offset.
  local shown
  shown="$(TZ=America/Los_Angeles date -d "$now" +'%a %Y-%m-%d %H:%M %Z %z')"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL  ${label}"
    echo "      now=${now}  local=${shown}  want proceed=${want}  got proceed=${got}"
    echo "      output:"
    printf '      %s\n' "$out"
    fail=$((fail + 1))
  else
    echo "PASS  ${label}  (${shown} -> proceed=${got})"
  fi
}

# --- PST: DST ended 2026-11-01 02:00. Fri Nov 20 / Sat Nov 21 are PST (UTC-8).
expect "2026-11-20 15:59:00" true  "PST Fri 15:59 (just before window)"
expect "2026-11-20 16:00:00" false "PST Fri 16:00 (window start, inclusive)"
expect "2026-11-20 16:00:01" false "PST Fri 16:00:01"
expect "2026-11-20 23:59:00" false "PST Fri 23:59"
expect "2026-11-21 00:00:00" false "PST Sat 00:00"
expect "2026-11-21 21:29:00" false "PST Sat 21:29 (still inside)"
expect "2026-11-21 21:30:00" true  "PST Sat 21:30 (window end, exclusive)"
expect "2026-11-21 21:31:00" true  "PST Sat 21:31"
expect "2026-11-19 16:00:00" true  "PST Thu 16:00 (not Friday)"
expect "2026-11-22 00:00:00" true  "PST Sun 00:00 (after Shabbat)"

# --- PDT: DST starts 2026-03-08 02:00. Fri Mar 13 / Sat Mar 14 are PDT (UTC-7).
expect "2026-03-13 15:59:00" true  "PDT Fri 15:59 (just before window, DST date)"
expect "2026-03-13 16:00:00" false "PDT Fri 16:00 (window start, DST date)"
expect "2026-03-14 21:29:00" false "PDT Sat 21:29 (DST date)"
expect "2026-03-14 21:30:00" true  "PDT Sat 21:30 (DST date, exclusive end)"

# --- PST just before that DST start, for contrast.
expect "2026-03-06 15:59:00" true  "PST Fri 15:59 (week before DST start)"
expect "2026-03-06 16:00:00" false "PST Fri 16:00 (week before DST start)"
expect "2026-03-07 21:29:00" false "PST Sat 21:29 (week before DST start)"
expect "2026-03-07 21:30:00" true  "PST Sat 21:30 (week before DST start)"

# --- Midsummer PDT
expect "2026-06-19 15:59:00" true  "PDT Fri 15:59 (June)"
expect "2026-06-19 16:00:00" false "PDT Fri 16:00 (June)"
expect "2026-06-20 21:29:00" false "PDT Sat 21:29 (June)"
expect "2026-06-20 21:30:00" true  "PDT Sat 21:30 (June)"

# GITHUB_OUTPUT is written when set
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
out="$(GITHUB_OUTPUT="$tmp" SHABBAT_GUARD_NOW="2026-11-20 16:00:00" bash "$GUARD")"
got="$(awk -F= '/^proceed=/{print $2}' "$tmp" | tail -n1)"
ran=$((ran + 1))
if [[ "$got" != "false" ]]; then
  echo "FAIL  GITHUB_OUTPUT was not written with proceed=false (got '${got}')"
  fail=$((fail + 1))
else
  echo "PASS  GITHUB_OUTPUT written (proceed=false)"
fi

# Always-zero exit even when skipping (do not fail the job)
set +e
SHABBAT_GUARD_NOW="2026-11-20 16:00:00" bash "$GUARD" >/dev/null
rc=$?
set -e
ran=$((ran + 1))
if [[ "$rc" -ne 0 ]]; then
  echo "FAIL  guard exited ${rc} when skipping; must exit 0"
  fail=$((fail + 1))
else
  echo "PASS  guard exits 0 when skipping"
fi

echo
if [[ "$fail" -ne 0 ]]; then
  echo "${fail} of ${ran} checks failed"
  exit 1
fi
echo "All ${ran} checks passed"
exit 0
