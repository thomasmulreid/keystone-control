#!/usr/bin/env python3
"""Generate scripts/business-units.json from a live read_business_units payload.

Replaces what used to be a hand-transcribed file. Hand transcription was correct
on the day and silently wrong thereafter: it could not see a new account, a
changed spend limit, or a new associate.
"""
import json, os, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
TR = os.environ.get("CT_TOOL_RESULTS", "")

newest = max(glob.glob(os.path.join(TR, "*read_business_units*")), key=os.path.getmtime)
units = json.load(open(newest))["results"]

out = []
for u in units:
    f = (u.get("custom") or {}).get("fields") or {}
    addr = (u.get("addresses") or [{}])[0]
    out.append({
        "key": u["key"],
        "id": u["id"],
        "name": u["name"],
        "unitType": u.get("unitType"),
        "parent": (u.get("parentUnit") or {}).get("key"),
        "store": ((u.get("stores") or u.get("inheritedStores") or [{}])[0] or {}).get("key"),
        "city": addr.get("city", ""),
        "state": addr.get("state", ""),
        "contactEmail": u.get("contactEmail"),
        "buyerLimit": f.get("buyerLimit"),
        "limitExceededBehavior": f.get("limitExceededBehavior"),
        "associates": [
            {"id": a["customer"]["id"],
             "role": (a["associateRoleAssignments"] or [{}])[0].get("associateRole", {}).get("key")}
            for a in (u.get("associates") or [])
        ],
        # Keystone is the merchant, not a customer account.
        **({"isMerchant": True} if u["key"] == "keystone" else {}),
    })

json.dump(out, open(os.path.join(HERE, "business-units.json"), "w"), indent=1)
print(f"wrote {len(out)} business units from {os.path.basename(newest)}")
for u in out:
    if u["unitType"] == "Company":
        print(f"  {u['name'][:34]:34} limit {str(u['buyerLimit']):>9}  assoc {len(u['associates'])}")
