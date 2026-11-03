#!/usr/bin/env python3
"""
Guard the one-source-of-truth property.

Three ways config can rot silently, all of which happened at least once:

  1. A TargetDef reads a different policy key than its own `key`. The value
     looks right until someone sets the other key, then a concentration
     ceiling quietly becomes a revenue target.
  2. A TargetDef references a policy key that does not exist, so it silently
     falls back to a hardcoded default nobody can see.
  3. A policy threshold drives behaviour but has no TargetDef, so it is a
     number with no named owner and no way to discover it in the UI.

Run in CI. Exits non-zero on any of them.
"""
import re, glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
policy = json.load(open(os.path.join(ROOT, "config", "policy.json")))
targets = set(policy["targets"])
files = glob.glob(os.path.join(ROOT, "src/functions/*.ts")) + \
        glob.glob(os.path.join(ROOT, "src/functions/customer/*.ts"))

problems, referenced = [], set()
for p in files:
    if os.path.basename(p) in ("types.ts", "index.ts", "policy.ts"):
        continue
    s = open(p).read()
    for key, val in re.findall(r'key: "([a-z_]+)",.*?value: ([^,\n]+),', s, re.S):
        m = re.match(r'target\("([a-z_]+)"', val.strip())
        if not m:
            continue
        referenced.add(m.group(1))
        if m.group(1) != key:
            problems.append(f"{os.path.basename(p)}: TargetDef '{key}' reads policy key '{m.group(1)}'")
        if m.group(1) not in targets:
            problems.append(f"{os.path.basename(p)}: '{key}' references missing policy key '{m.group(1)}'")

# a threshold that changes behaviour must be discoverable and owned
used_by_rules = {r["minAgeDaysFrom"] for r in policy["exceptions"] if r.get("minAgeDaysFrom")}
for key in sorted(used_by_rules - referenced):
    problems.append(f"policy.json: '{key}' drives an exception rule but has no TargetDef (no named owner)")

for p in problems:
    print(f"  FAIL  {p}")
print(f"\n  {len(targets)} policy targets, {len(referenced)} referenced"
      + ("  — config is consistent" if not problems else f"  — {len(problems)} problem(s)"))
sys.exit(1 if problems else 0)
