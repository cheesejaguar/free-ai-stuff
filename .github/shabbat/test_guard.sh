#!/usr/bin/env bash
# Unit tests for the Shabbat guard.
# Fri 15:59 vs 16:00, Sat 21:29 vs 21:30, in PST and PDT, including the
# real DST-transition weekends (fall back 2026-11-01, spring forward 2027-03-14).
# Also asserts a fail-closed skip when tzdata is missing (offset not -0700/-0800).
# The test clock is computed in Python (zoneinfo) so this harness is not
# GNU-date-only. Exit 0 on success, 1 on failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
GUARD="${ROOT}/guard.sh"
fail=0
ran=0

# Portable local-time display: Python zoneinfo, not GNU date -d.
local_show() {
  python3 -c '
from datetime import datetime
from zoneinfo import ZoneInfo
import sys
now = datetime.strptime(sys.argv[1], "%Y-%m-%d %H:%M:%S").replace(
    tzinfo=ZoneInfo("America/Los_Angeles")
)
print(now.strftime("%a %Y-%m-%d %H:%M %Z %z"))
' "$1"
}

expect() {
  local now="$1" want="$2" label="$3"
  ran=$((ran + 1))
  local out got shown
  out="$(SHABBAT_GUARD_NOW="$now" bash "$GUARD")"
  got="$(printf '%s\n' "$out" | awk -F= '/^proceed=/{print $2}' | tail -n1)"
  shown="$(local_show "$now")"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL  ${label}"
    echo "      now=${now}  local=${shown}  want proceed=${want}  got proceed=${got}"
    echo "      output:"
    printf '      %s\n' "$out"
    fail=$((fail + 1))
  elif [[ "$want" == "false" ]] && ! printf '%s\n' "$out" | grep -q '::warning::'; then
    echo "FAIL  ${label}: skip path must emit ::warning:: with the reason"
    echo "      output:"
    printf '      %s\n' "$out"
    fail=$((fail + 1))
  elif [[ "$want" == "true" ]] && printf '%s\n' "$out" | grep -q '::warning::'; then
    echo "FAIL  ${label}: proceed=true must not emit ::warning::"
    echo "      output:"
    printf '      %s\n' "$out"
    fail=$((fail + 1))
  else
    echo "PASS  ${label}  (${shown} -> proceed=${got})"
  fi
}

# --- PST after the 2026-11-01 fall-back. Fri Nov 20 / Sat Nov 21 are PST (UTC-8).
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

# --- Midsummer PDT (no DST change that weekend).
expect "2026-06-19 15:59:00" true  "PDT Fri 15:59 (June)"
expect "2026-06-19 16:00:00" false "PDT Fri 16:00 (June)"
expect "2026-06-20 21:29:00" false "PDT Sat 21:29 (June)"
expect "2026-06-20 21:30:00" true  "PDT Sat 21:30 (June)"

# --- DST fall-back weekend: Sunday 2026-11-01 02:00 PDT -> 01:00 PST.
# The Fri/Sat window is still PDT. Edges of that window:
expect "2026-10-30 15:59:00" true  "PDT Fri 15:59 (weekend of 2026-11-01 fall-back)"
expect "2026-10-30 16:00:00" false "PDT Fri 16:00 (weekend of 2026-11-01 fall-back)"
expect "2026-10-31 21:29:00" false "PDT Sat 21:29 (weekend of 2026-11-01 fall-back)"
expect "2026-10-31 21:30:00" true  "PDT Sat 21:30 (weekend of 2026-11-01 fall-back)"
expect "2026-11-01 00:00:00" true  "PDT Sun 00:00 (after Shabbat, still before fall-back)"

# --- DST spring-forward weekend: Sunday 2027-03-14 02:00 PST -> 03:00 PDT.
# The Fri/Sat window is still PST. Edges of that window:
expect "2027-03-12 15:59:00" true  "PST Fri 15:59 (weekend of 2027-03-14 spring-forward)"
expect "2027-03-12 16:00:00" false "PST Fri 16:00 (weekend of 2027-03-14 spring-forward)"
expect "2027-03-13 21:29:00" false "PST Sat 21:29 (weekend of 2027-03-14 spring-forward)"
expect "2027-03-13 21:30:00" true  "PST Sat 21:30 (weekend of 2027-03-14 spring-forward)"
expect "2027-03-14 00:00:00" true  "PST Sun 00:00 (after Shabbat, still before spring-forward)"

# GITHUB_OUTPUT is written when set
tmp="$(mktemp)"
empty_tz="$(mktemp -d)"
trap 'rm -f "$tmp"; rm -rf "$empty_tz"' EXIT
out="$(GITHUB_OUTPUT="$tmp" SHABBAT_GUARD_NOW="2026-11-20 16:00:00" bash "$GUARD")"
got="$(awk -F= '/^proceed=/{print $2}' "$tmp" | tail -n1)"
ran=$((ran + 1))
if [[ "$got" != "false" ]]; then
  echo "FAIL  GITHUB_OUTPUT was not written with proceed=false (got '${got}')"
  fail=$((fail + 1))
elif ! printf '%s\n' "$out" | grep -q '::warning::'; then
  echo "FAIL  in-window skip (GITHUB_OUTPUT case) must emit ::warning:: with the reason"
  printf '      %s\n' "$out"
  fail=$((fail + 1))
else
  echo "PASS  GITHUB_OUTPUT written (proceed=false) and ::warning:: emitted"
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

# Fail closed if tzdata is missing: never judge in UTC.
# Stub `date` so this does not depend on TZDIR (macOS ignores TZDIR and would
# still resolve America/Los_Angeles). When TZ=America/Los_Angeles and %z is
# requested, the stub reports +0000 the way GNU date does with missing tzdata.
# Thursday 16:00 would proceed if that UTC fallback were trusted.
stub="$empty_tz/bin"
mkdir -p "$stub"
cat > "$stub/date" << "STUB"
#!/usr/bin/env bash
# Delegate unless this is the America/Los_Angeles clock read (format has %z).
real_date="$(command -v date)"
# Prefer the system date, not this stub (we are first on PATH).
for cand in /bin/date /usr/bin/date; do
  if [[ -x "$cand" && "$cand" != "$0" ]]; then
    real_date="$cand"
    break
  fi
done
args="$*"
if [[ "${TZ:-}" == "America/Los_Angeles" && "$args" == *"%z"* ]]; then
  echo "dow=4 time=1600 off=+0000 pretty=2026-11-19T16:00:00+0000"
  exit 0
fi
exec "$real_date" "$@"
STUB
chmod +x "$stub/date"
set +e
out="$(PATH="$stub:$PATH" SHABBAT_GUARD_NOW="2026-11-19 16:00:00" bash "$GUARD")"
rc=$?
set -e
got="$(printf '%s\n' "$out" | awk -F= '/^proceed=/{print $2}' | tail -n1)"
ran=$((ran + 1))
if [[ "$rc" -ne 0 ]]; then
  echo "FAIL  missing-tzdata guard exited ${rc}; must exit 0 with proceed=false"
  printf '      %s\n' "$out"
  fail=$((fail + 1))
elif [[ "$got" != "false" ]]; then
  echo "FAIL  missing tzdata must set proceed=false, never judge in UTC (got proceed=${got})"
  printf '      %s\n' "$out"
  fail=$((fail + 1))
elif ! printf '%s\n' "$out" | grep -Eq '(-0700|-0800)|tzdata|offset|\+0000'; then
  echo "FAIL  missing-tzdata skip did not explain why (expected offset / tzdata in the log)"
  printf '      %s\n' "$out"
  fail=$((fail + 1))
elif ! printf '%s\n' "$out" | grep -q '::warning::'; then
  echo "FAIL  missing-tzdata skip must emit ::warning:: with the reason (so a skip is not silently green)"
  printf '      %s\n' "$out"
  fail=$((fail + 1))
else
  echo "PASS  missing tzdata fails closed (proceed=false, exit 0, ::warning::)"
fi

echo
if [[ "$fail" -ne 0 ]]; then
  echo "${fail} of ${ran} checks failed"
  exit 1
fi
echo "All ${ran} checks passed"
exit 0
