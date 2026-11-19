#!/usr/bin/env python3
"""Acceptance test: no GitHub Actions cron in this repo fires inside Shabbat.

Windows (end exclusive), judged in UTC against both offsets:
  PST: Sat 00:00 UTC to Sun 05:30 UTC
  PDT: Fri 23:00 UTC to Sun 04:30 UTC

A cron is unsafe if any fire from 2026-01-01 through 18 months later lands
in either window. Stdlib only (no croniter). Also checks that any reusable
Shabbat guard workflow's inline script matches .github/shabbat/guard.sh
when both exist.

Exit 0 if all scheduled crons are safe (or there are none). Exit 1 otherwise.
"""

from __future__ import annotations

import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Walk up from this file to the repo root (look for .git or .github).
HERE = Path(__file__).resolve().parent


def repo_root() -> Path:
    candidates = [HERE, *HERE.parents, Path.cwd(), *Path.cwd().parents]
    for p in candidates:
        if (p / ".github" / "workflows").is_dir():
            return p
    for p in candidates:
        if (p / ".git").exists():
            return p
    return Path.cwd()


ROOT = repo_root()
WF_DIR = ROOT / ".github" / "workflows"

PST_START = (5, 0 * 60 + 0)  # Sat 00:00, weekday Mon=0
PST_END = (6, 5 * 60 + 30)  # Sun 05:30
PDT_START = (4, 23 * 60 + 0)  # Fri 23:00
PDT_END = (6, 4 * 60 + 30)  # Sun 04:30

LONG_START = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
LONG_END = LONG_START + timedelta(days=int(18 * 30.44) + 2)

# Quoted or unquoted 5-field cron after `cron:`.
CRON_RE = re.compile(
    r"""(?m)^\s*-?\s*cron\s*:\s*(?:['\"]([^'\"]+)['\"]|([0-9*,/\-]+(?:\s+[0-9A-Za-z*,/\-]+){4}))""",
    re.IGNORECASE,
)
SCHEDULE_RE = re.compile(r"(?m)^\s*schedule\s*:")

DOW_NAMES = {
    "sun": 0,
    "mon": 1,
    "tue": 2,
    "wed": 3,
    "thu": 4,
    "fri": 5,
    "sat": 6,
}
MON_NAMES = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def _token(value: str, names: dict[str, int] | None) -> int:
    v = value.strip().lower()
    if names and v in names:
        return names[v]
    return int(v)


def parse_field(field: str, lo: int, hi: int, names: dict[str, int] | None = None) -> set[int]:
    out: set[int] = set()
    for part in field.split(","):
        part = part.strip()
        if not part:
            continue
        step = 1
        stepped = False
        if "/" in part:
            part, step_s = part.split("/", 1)
            step = int(step_s)
            part = part.strip() or "*"
            stepped = True
        if part in ("*", ""):
            start, end = lo, hi
        elif "-" in part:
            a, b = part.split("-", 1)
            start, end = _token(a, names), _token(b, names)
        else:
            # `22/1` means 22 through the field max, not only 22 (POSIX/GitHub cron).
            start = _token(part, names)
            end = hi if stepped else start
        if start > end:
            # wrap, e.g. fri-sun in some crons; handle linearly only if no wrap
            vals = list(range(start, hi + 1, step)) + list(range(lo, end + 1, step))
        else:
            vals = list(range(start, end + 1, step))
        for v in vals:
            if lo <= v <= hi:
                out.add(v)
    return out


def parse_cron(expr: str) -> tuple[set[int], set[int], set[int], set[int], set[int], bool, bool]:
    parts = expr.split()
    if len(parts) != 5:
        raise ValueError(f"expected 5-field cron, got {len(parts)}: {expr!r}")
    minute = parse_field(parts[0], 0, 59)
    hour = parse_field(parts[1], 0, 23)
    dom = parse_field(parts[2], 1, 31)
    month = parse_field(parts[3], 1, 12, MON_NAMES)
    dow_raw = parse_field(parts[4], 0, 7, DOW_NAMES)
    dow = {0 if d == 7 else d for d in dow_raw}
    dom_star = parts[2] == "*"
    dow_star = parts[4] == "*"
    return minute, hour, dom, month, dow, dom_star, dow_star


def cron_dow(dt: datetime) -> int:
    # datetime.weekday(): Mon=0 ... Sun=6. Cron: Sun=0 ... Sat=6.
    return (dt.weekday() + 1) % 7


def matches(dt: datetime, parsed: tuple) -> bool:
    minute, hour, dom, month, dow, dom_star, dow_star = parsed
    if dt.minute not in minute or dt.hour not in hour or dt.month not in month:
        return False
    day_ok = dt.day in dom
    dow_ok = cron_dow(dt) in dow
    if dom_star and dow_star:
        return True
    if (not dom_star) and (not dow_star):
        return day_ok or dow_ok
    if not dom_star:
        return day_ok
    return dow_ok


def in_window(dt: datetime, start: tuple[int, int], end: tuple[int, int]) -> bool:
    key = (dt.weekday(), dt.hour * 60 + dt.minute)
    return start <= key < end


def fires_in_range(expr: str, start: datetime, end: datetime) -> list[datetime]:
    parsed = parse_cron(expr)
    minute, hour, _dom, month, _dow, _ds, _ws = parsed
    hits: list[datetime] = []
    # Iterate candidate minutes only.
    day = start.date()
    last = end.date()
    while day < last:
        if day.month in month:
            for h in hour:
                for m in minute:
                    dt = datetime(day.year, day.month, day.day, h, m, tzinfo=timezone.utc)
                    if start <= dt < end and matches(dt, parsed):
                        hits.append(dt)
        day += timedelta(days=1)
    return hits


def extract_crons(text: str) -> list[str]:
    if not SCHEDULE_RE.search(text or ""):
        return []
    crons: list[str] = []
    # Prefer a YAML parse so unquoted `cron: 17 5 * * 6` is not missed.
    try:
        import yaml  # type: ignore
    except ImportError:
        yaml = None  # type: ignore
    if yaml is not None:
        try:
            docs = list(yaml.safe_load_all(text))
        except Exception:
            docs = []
        for doc in docs:
            if not isinstance(doc, dict):
                continue
            on = doc.get("on")
            # YAML 1.1 may parse a bare `on:` key as boolean true.
            if on is True:
                on = doc.get("true") or doc.get("True") or on
            if not isinstance(on, dict):
                continue
            schedule = on.get("schedule")
            if not schedule:
                continue
            if isinstance(schedule, dict):
                schedule = [schedule]
            for item in schedule:
                if isinstance(item, dict) and item.get("cron") is not None:
                    crons.append(str(item["cron"]).strip())
                elif isinstance(item, str):
                    crons.append(item.strip())
        if crons:
            return crons
    found: list[str] = []
    for m in CRON_RE.finditer(text or ""):
        expr = (m.group(1) or m.group(2) or "").strip()
        if expr:
            found.append(expr)
    return found


def describe(dt: datetime) -> str:
    return dt.strftime("%a %Y-%m-%d %H:%M UTC")


def strip_script(text: str) -> str:
    """Normalize a bash script for comparison (drop comments and blank lines)."""
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        lines.append(" ".join(s.split()))
    return "\n".join(lines)


def guard_sync_ok() -> list[str]:
    """If a reusable guard workflow inlines the script, it must match guard.sh."""
    errors: list[str] = []
    guard = ROOT / ".github" / "shabbat" / "guard.sh"
    if not guard.is_file():
        return errors
    src = strip_script(guard.read_text())
    for wf in sorted(WF_DIR.glob("*.yml")) + sorted(WF_DIR.glob("*.yaml")):
        text = wf.read_text()
        if "BEGIN SHABBAT_GUARD" not in text:
            continue
        chunks = re.findall(
            r"BEGIN SHABBAT_GUARD\s*\n(.*?)# END SHABBAT_GUARD",
            text,
            flags=re.S,
        )
        if not chunks:
            errors.append(f"{wf.name}: found BEGIN SHABBAT_GUARD but no matching END")
            continue
        for i, chunk in enumerate(chunks, 1):
            # Unindent common YAML run-block indent
            lines = [ln[2:] if ln.startswith("  ") else ln for ln in chunk.splitlines()]
            # keep unindenting while all nonempty lines share a 2-space prefix
            body = "\n".join(lines)
            while True:
                nonempty = [ln for ln in body.splitlines() if ln.strip()]
                if nonempty and all(ln.startswith("  ") for ln in nonempty):
                    body = "\n".join(ln[2:] if ln.startswith("  ") else ln for ln in body.splitlines())
                else:
                    break
            if strip_script(body) != src:
                errors.append(
                    f"{wf.name} inline block {i} does not match .github/shabbat/guard.sh"
                )
    return errors



def _job_blocks(text: str) -> dict[str, str]:
    """Split a workflow into indent-2 job name -> raw job body (including name line)."""
    lines = text.splitlines()
    try:
        jobs_i = next(i for i, ln in enumerate(lines) if ln == "jobs:" or ln.startswith("jobs:"))
    except StopIteration:
        return {}
    blocks: dict[str, list[str]] = {}
    current: str | None = None
    for ln in lines[jobs_i + 1 :]:
        if ln.startswith("  ") and not ln.startswith("    ") and ln.strip().endswith(":"):
            name = ln.strip().rstrip(":")
            current = name
            blocks[current] = [ln]
        elif current is not None:
            if ln and not ln.startswith(" ") and not ln.startswith("\t"):
                break
            blocks[current].append(ln)
    return {k: "\n".join(v) for k, v in blocks.items()}


def check_workflow_wiring(wf: Path) -> list[str]:
    """Enforce Kyle's wiring nits/minors on workflows that use the Shabbat guard."""
    text = wf.read_text()
    rel = f".github/workflows/{wf.name}"
    problems: list[str] = []
    if "shabbat-guard.yml" not in text and wf.name != "shabbat-guard.yml":
        return problems

    if wf.name == "shabbat-guard.yml":
        if "permissions: {}" not in text:
            problems.append(f"{rel}: reusable guard job must set permissions: {{}}")
        return problems

    jobs = _job_blocks(text)
    for name, body in jobs.items():
        if "shabbat-guard.yml" in body and "uses:" in body:
            if "permissions: {}" not in body:
                problems.append(f"{rel}: job {name!r} (guard caller) must set permissions: {{}}")

    for name, body in jobs.items():
        needs_recheck = _needs_shabbat_guard(body) and _runs_on_is_not_plain_ubuntu(body)
        steps = _steps(body)
        has_recheck = any(_step_id(s) == "recheck" for s in steps)
        if needs_recheck and not has_recheck:
            problems.append(
                f"{rel}: job {name!r} runs on a different runner than the "
                "hosted guard and must start with an on-runner recheck step"
            )
        if not has_recheck:
            continue
        if not steps or _step_id(steps[0]) != "recheck":
            problems.append(f"{rel}: job {name!r} recheck step must be the first step")
            continue
        first = steps[0]
        if "shell: bash" not in first:
            problems.append(f"{rel}: job {name!r} recheck step must set shell: bash")
        for i, step in enumerate(steps[1:], start=2):
            if not _step_gated_on_recheck(step):
                problems.append(
                    f"{rel}: job {name!r} step {i} must set "
                    "if: steps.recheck.outputs.proceed == 'true'"
                )
        if not _job_publishes_recheck(body):
            # Only required if some other job depends on this one.
            dependents = [
                other for other, obody in jobs.items()
                if other != name and _needs_job(obody, name)
            ]
            if dependents:
                problems.append(
                    f"{rel}: job {name!r} has dependents {dependents} and must "
                    "publish outputs.proceed from steps.recheck.outputs.proceed"
                )

    recheck_jobs = [n for n, b in jobs.items() if "id: recheck" in b]
    for name, body in jobs.items():
        for src in recheck_jobs:
            if name == src:
                continue
            if not _needs_job(body, src):
                continue
            if not _job_if_gated_on_need_proceed(body, src):
                problems.append(
                    f"{rel}: job {name!r} needs {src!r} (which has a recheck) and "
                    f"must set if: needs.{src}.outputs.proceed == 'true' "
                    "so it does not run after a skipped-in-job recheck"
                )
    return problems


def _steps(job_body: str) -> list[str]:
    lines = job_body.splitlines()
    start = None
    for i, ln in enumerate(lines):
        if ln.strip() == "steps:" or ln.strip().startswith("steps:"):
            start = i + 1
            break
    if start is None:
        return []
    steps: list[list[str]] = []
    current: list[str] = []
    item_indent: int | None = None
    for ln in lines[start:]:
        raw = ln.replace("\t", "        ")
        if not raw.strip():
            if current:
                current.append(ln)
            continue
        stripped = raw.lstrip(" ")
        lead = len(raw) - len(stripped)
        if stripped.startswith("- "):
            if item_indent is None:
                item_indent = lead
            if lead == item_indent:
                if current:
                    steps.append(current)
                current = [ln]
                continue
        if current:
            current.append(ln)
    if current:
        steps.append(current)
    return ["\n".join(s) for s in steps]


def _step_id(step: str) -> str | None:
    m = re.search(r"(?m)^\s+id:\s*(\S+)\s*$", step)
    if m:
        return m.group(1).strip().strip("'\"")
    m = re.search(r"(?m)^\s*-\s+id:\s*(\S+)\s*$", step)
    return m.group(1).strip().strip("'\"") if m else None


def _step_gated_on_recheck(step: str) -> bool:
    """True if the step's if: requires steps.recheck.outputs.proceed == true."""
    # Job/step if: may be a folded scalar; search the step header (before run:/uses: blocks' bodies).
    header = step.split("run:", 1)[0]
    if_lines = []
    capturing = False
    for ln in header.splitlines():
        if re.search(r"(?m)^\s+if:\s*", ln) or ln.lstrip().startswith("- if:"):
            capturing = True
            if_lines.append(ln.split("if:", 1)[1])
            continue
        if capturing:
            if re.search(r"(?m)^\s+\w", ln) and not ln.strip().startswith("|") and not ln.strip().startswith(">"):
                # next key
                break
            if_lines.append(ln)
    expr = " ".join(s.strip() for s in if_lines)
    return bool(
        re.search(r"steps\.recheck\.outputs\.proceed\s*==\s*['\"]true['\"]", expr)
    )


def _job_publishes_recheck(job_body: str) -> bool:
    # outputs: proceed: ${{ steps.recheck.outputs.proceed }}
    head = job_body.split("steps:", 1)[0]
    return bool(
        re.search(r"steps\.recheck\.outputs\.proceed", head)
        and re.search(r"(?m)^\s+outputs:\s*$", head)
        and re.search(r"(?m)^\s+proceed:\s*", head)
    )


def _job_if_gated_on_need_proceed(job_body: str, src: str) -> bool:
    head = job_body.split("steps:", 1)[0]
    return bool(
        re.search(
            rf"needs\.{re.escape(src)}\.outputs\.proceed\s*==\s*['\"]true['\"]",
            head,
        )
    )


def _needs_shabbat_guard(job_body: str) -> bool:
    return bool(re.search(r"(?m)^\s+needs:\s*shabbat-guard\s*$", job_body)) or (
        "needs:" in job_body and "shabbat-guard" in job_body
    )


def _needs_job(job_body: str, job_name: str) -> bool:
    if re.search(rf"(?m)^\s+needs:\s*{re.escape(job_name)}\s*$", job_body):
        return True
    if "needs:" in job_body and re.search(rf"\b{re.escape(job_name)}\b", job_body):
        return "uses:" not in job_body.split("needs:", 1)[0][-40:]
    return False


def _runs_on_is_not_plain_ubuntu(job_body: str) -> bool:
    """True unless runs-on is exactly the scalar ubuntu-latest.

    List forms (`[self-hosted, linux]`), mappings, fleet expressions, and
    block scalars all require an on-runner recheck.
    """
    m = re.search(r"(?m)^(\s*)runs-on:\s*(.*)$", job_body)
    if not m:
        return False
    rest = m.group(2).strip()
    # Strip a trailing comment
    if "#" in rest:
        rest = rest.split("#", 1)[0].strip()
    return rest != "ubuntu-latest"


def main() -> int:
    if not WF_DIR.is_dir():
        print(f"No {WF_DIR}; nothing to check.")
        return 0
    problems: list[str] = []
    checked = 0
    print(f"Repo root: {ROOT}")
    print(f"Scanning {WF_DIR}")
    files = sorted(set(list(WF_DIR.glob("*.yml")) + list(WF_DIR.glob("*.yaml"))))
    for wf in files:
        crons = extract_crons(wf.read_text())
        if not crons:
            continue
        rel = f".github/workflows/{wf.name}"
        for expr in crons:
            checked += 1
            try:
                hits = fires_in_range(expr, LONG_START, LONG_END)
            except Exception as e:  # noqa: BLE001
                problems.append(f"{rel}: cron {expr!r} failed to expand: {e}")
                continue
            pst = [h for h in hits if in_window(h, PST_START, PST_END)]
            pdt = [h for h in hits if in_window(h, PDT_START, PDT_END)]
            if pst or pdt:
                sample = pst[:3] or pdt[:3]
                problems.append(
                    f"{rel}: cron `{expr}` has {len(pst)} PST and {len(pdt)} PDT "
                    f"in-window fires (e.g. {describe(sample[0])})"
                )
            else:
                print(f"SAFE  {rel}  cron `{expr}`  fires_18m={len(hits)}")
    for err in guard_sync_ok():
        problems.append(err)
    for wf in files:
        for err in check_workflow_wiring(wf):
            problems.append(err)
    if problems:
        print()
        print("UNSAFE / failed checks:")
        for p in problems:
            print(f"  - {p}")
        print(f"{len(problems)} problem(s), {checked} cron(s) checked")
        return 1
    print()
    print(f"All {checked} scheduled cron(s) are outside the PST and PDT Shabbat windows.")
    return 0


def _self_check_extract() -> None:
    """Guard against the quoted-only regex hole (unquoted YAML crons)."""
    sample = """
name: x
on:
  schedule:
    - cron: 17 5 * * 6
    - cron: "17 5 * * 1-5"
"""
    got = extract_crons(sample)
    if "17 5 * * 6" not in got or "17 5 * * 1-5" not in got:
        raise SystemExit(f"extract_crons missed unquoted/quoted crons: {got!r}")
    # `22/1` in the hour field is 22 and 23; Fri 23:00 UTC is the PDT window start.
    if 23 not in parse_field("22/1", 0, 23):
        raise SystemExit("parse_field failed to expand 22/1 through the field max")
    hits = fires_in_range("0 22/1 * * 5", LONG_START, datetime(2026, 3, 31, tzinfo=timezone.utc))
    pdt = [h for h in hits if in_window(h, PDT_START, PDT_END)]
    if not pdt:
        raise SystemExit("expected 0 22/1 * * 5 to flag Fri 23:00 UTC in the PDT window")


if __name__ == "__main__":
    _self_check_extract()
    raise SystemExit(main())
