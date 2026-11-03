#!/usr/bin/env python3
"""
Build the control-panel snapshot from raw commercetools reads.

PROTOTYPE SEAM
--------------
Today this reads JSON that the commercetools MCP tools already returned and
saved to disk. In hardening, replace `load_raw()` with live calls to:
    read_orders, read_quote_requests, read_business_units
and run this on a schedule (or on demand) into a cache. Everything below
`load_raw()` is pure computation over the same shapes, so nothing else changes.

Every derived number carries its own definition in DEFINITIONS so the UI can
show "how is this calculated?" next to the figure. No metric ships without one.
"""
import json, os, sys, glob, statistics, collections, calendar
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TOOL_RESULTS = os.environ.get("CT_TOOL_RESULTS", "")
# Snapshot "now" is the most recent event in the data, so ages are never negative.
# Set at load time in main().
AS_OF = datetime(2026, 10, 2, tzinfo=timezone.utc)

# --------------------------------------------------------------------------
# Category derivation. The project has a single productType, so category is
# inferred from SKU tokens. In hardening this is replaced by the real category
# tree via read_categories.
# --------------------------------------------------------------------------
CATEGORY_RULES = [
    # Consumer appliances first: they are the surprise in this catalogue and
    # must not be swallowed by a broader rule. Surfacing them is the point.
    ("Home & Kitchen",     ["waffle", "toaster", "coffeemaker", "blender", "steam-mop",
                            "dustbuster", "hand-vacuum", "kettle", "air-fryer"]),
    ("Outdoor Tools",      ["blower", "trimmer", "mower", "chainsaw", "hedge", "pressure-washer"]),
    ("Industrial Storage", ["vidmar", "lista", "cabinet", "workbench", "shelving", "locker",
                            "versatrack", "trackwall"]),
    ("Storage",            ["toolbox", "toughsystem", "tote", "tstak", "rolling", "organizer", "crate"]),
    ("Inventory Mgmt",     ["cribmaster", "accuport", "bin", "label", "scanner", "dispenser"]),
    ("Fastening",          ["anchor", "fastener", "fastening", "lockbolt", "nailer",
                            "stapler", "rivet", "assembly-platform"]),
    ("Hand Tools",         ["wrench", "plier", "hammer-tool", "screwdriver", "tape-measure", "level"]),
    ("Power Tools",        ["drill", "saw", "driver", "grinder", "sander", "router", "impact",
                            "work-light", "grease-gun", "multi-tool", "rotary", "compressor",
                            "polisher", "vacuum", "oscillating"]),
]

def categorise(sku: str) -> str:
    s = (sku or "").lower()
    for name, tokens in CATEGORY_RULES:
        if any(t in s for t in tokens):
            return name
    return "Other"


def load_raw():
    """Load raw commercetools payloads saved by the MCP read tools."""
    if not TOOL_RESULTS or not os.path.isdir(TOOL_RESULTS):
        sys.exit("Set CT_TOOL_RESULTS to the directory holding the saved MCP read payloads.")
    # Oldest file first, so that when the same object appears in several
    # fetches the NEWEST copy wins the de-duplication below. An order whose
    # state changed since an earlier pull must not be resurrected stale.
    def by_age(pattern):
        return sorted(glob.glob(os.path.join(TOOL_RESULTS, pattern)), key=os.path.getmtime)

    orders, quotes = [], []
    for path in by_age("*read_orders*"):
        orders.extend(json.load(open(path)).get("results", []))
    for path in by_age("*read_quote_requests*"):
        quotes.extend(json.load(open(path)).get("results", []))

    # dict comprehension: later entries overwrite earlier ones => newest wins
    orders = list({o["id"]: o for o in orders}.values())
    quotes = list({q["id"]: q for q in quotes}.values())
    units = json.load(open(os.path.join(HERE, "business-units.json")))
    return orders, quotes, units


def money(cents):                 return round((cents or 0) / 100, 2)
def dt(s):                        return datetime.fromisoformat(s.replace("Z", "+00:00"))
def age_days(s):                  return (AS_OF - dt(s)).days
def month_key(s):                 return s[:7]


def business_date(o):
    """When the business says the order happened.

    `createdAt` is when the record was WRITTEN, which for seeded or migrated
    history is the load date, not the trading date. The project carries the
    real trading date on custom.fields.orderDate. Attributing revenue by
    createdAt collapses a year of trading into whatever day the import ran.

    The handful of orders with no orderDate are all still Open — genuinely
    recent, not yet finalised — so createdAt is correct for those.
    """
    od = ((o.get("custom") or {}).get("fields") or {}).get("orderDate")
    return od if od else o["createdAt"]


def normalise_orders(raw):
    out = []
    for o in raw:
        bu = (o.get("businessUnit") or {}).get("key")
        lines = []
        for li in o.get("lineItems", []):
            sku = (li.get("variant") or {}).get("sku")
            attrs = {a["name"]: a["value"] for a in (li.get("variant") or {}).get("attributes", [])}
            unit = li["price"]["value"]["centAmount"]
            lines.append({
                "sku": sku,
                "name": (li.get("name") or {}).get("en-US", sku),
                "brand": attrs.get("brand"),
                "category": categorise(sku),
                "qty": li.get("quantity", 0),
                "unitCents": unit,
                "totalCents": li["totalPrice"]["centAmount"],
            })
        bd = business_date(o)
        out.append({
            "id": o["id"],
            "orderNumber": o.get("orderNumber") or f"CT-{o['id'][:8]}",
            # createdAt stays available, but every business figure uses the
            # trading date. Mixing the two is how a dashboard tells a lie.
            "recordCreatedAt": o["createdAt"],
            "createdAt": bd,
            "month": month_key(bd),
            "ageDays": age_days(bd),
            "businessUnit": bu,
            "store": (o.get("store") or {}).get("key"),
            "customerId": o.get("customerId"),
            "customerEmail": o.get("customerEmail"),
            "orderState": o.get("orderState"),
            "paymentState": o.get("paymentState"),
            "shipmentState": o.get("shipmentState"),
            "origin": o.get("origin"),
            "poNumber": ((o.get("custom") or {}).get("fields") or {}).get("poNumber"),
            "totalCents": (o.get("totalPrice") or {}).get("centAmount", 0),
            "lineCount": len(lines),
            "lines": lines,
        })
    return sorted(out, key=lambda x: x["createdAt"])


def normalise_quotes(raw):
    out = []
    for q in raw:
        out.append({
            "id": q["id"],
            "createdAt": q["createdAt"],
            "ageDays": age_days(q["createdAt"]),
            "state": q.get("quoteRequestState"),
            "businessUnit": (q.get("businessUnit") or {}).get("key"),
            "customerEmail": q.get("customerEmail"),
            "totalCents": (q.get("totalPrice") or {}).get("centAmount", 0),
            "lineCount": len(q.get("lineItems", [])),
            "comment": q.get("comment"),
        })
    return sorted(out, key=lambda x: x["createdAt"], reverse=True)


# --------------------------------------------------------------------------
# Pricing model.
#   list rate     = highest unit price observed for a SKU anywhere in the data
#   contract rate = lowest unit price THIS business unit has actually paid
#   savings       = (list - paid) x qty, summed      -> value the contract delivered
#   leakage       = (paid - contract) x qty, summed  -> value the contract SHOULD have
#                                                       delivered but didn't
# Leakage is the honest version of "are we getting our negotiated rate?" because
# it compares an account only against prices that same account has already been
# given. It never assumes a rate the account was never offered.
# --------------------------------------------------------------------------
def price_model(orders):
    list_rate = collections.defaultdict(int)
    bu_rates  = collections.defaultdict(lambda: collections.defaultdict(set))
    for o in orders:
        for l in o["lines"]:
            list_rate[l["sku"]] = max(list_rate[l["sku"]], l["unitCents"])
            if o["businessUnit"]:
                bu_rates[o["businessUnit"]][l["sku"]].add(l["unitCents"])
    contract_rate = {bu: {sku: min(v) for sku, v in skus.items()} for bu, skus in bu_rates.items()}
    return dict(list_rate), contract_rate


def account_rollup(orders, quotes, units, list_rate, contract_rate):
    by_unit = collections.defaultdict(list)
    for o in orders:
        if o["businessUnit"]:
            by_unit[o["businessUnit"]].append(o)

    unit_index = {u["key"]: u for u in units}
    accounts = []

    for u in units:
        if u.get("isMerchant") or u["unitType"] != "Company":
            continue
        key = u["key"]
        divisions = [d for d in units if d.get("parent") == key]
        os_ = sorted(by_unit.get(key, []), key=lambda x: x["createdAt"])
        for d in divisions:                      # roll division orders into the parent
            os_ += by_unit.get(d["key"], [])
        os_ = sorted(os_, key=lambda x: x["createdAt"])

        revenue = sum(o["totalCents"] for o in os_)
        months = collections.defaultdict(int)
        cats   = collections.defaultdict(int)
        skus   = collections.defaultdict(int)
        buyers = collections.Counter()
        savings = leak = 0
        leak_lines = []

        for o in os_:
            months[o["month"]] += o["totalCents"]
            if o["customerEmail"]:
                buyers[o["customerEmail"]] += o["totalCents"]
            for l in o["lines"]:
                cats[l["category"]] += l["totalCents"]
                skus[l["sku"]] += l["qty"]
                savings += (list_rate.get(l["sku"], l["unitCents"]) - l["unitCents"]) * l["qty"]
                cr = contract_rate.get(o["businessUnit"], {}).get(l["sku"])
                if cr is not None and l["unitCents"] > cr:
                    delta = (l["unitCents"] - cr) * l["qty"]
                    leak += delta
                    leak_lines.append({
                        "orderNumber": o["orderNumber"], "createdAt": o["createdAt"],
                        "sku": l["sku"], "name": l["name"], "qty": l["qty"],
                        "paidCents": l["unitCents"], "contractCents": cr,
                        "overpaidCents": delta, "buyer": o["customerEmail"],
                    })

        # Cadence is measured between distinct ORDER DAYS. Several orders cut on
        # the same day are one buying event, not evidence of a one-day rhythm.
        order_days = sorted({o["createdAt"][:10] for o in os_})
        gaps = [ (datetime.fromisoformat(order_days[i]) - datetime.fromisoformat(order_days[i-1])).days
                 for i in range(1, len(order_days)) ]
        median_gap = statistics.median(gaps) if gaps else None
        last = os_[-1]["createdAt"] if os_ else None
        days_since = max(age_days(last), 0) if last else None
        overdue = bool(median_gap and days_since is not None and median_gap > 0
                       and days_since > median_gap * 1.5)

        # Concentration by VALUE, not headcount. Three buyers where one places
        # 97% of the spend is a single-buyer account wearing a disguise.
        top_share = round(buyers.most_common(1)[0][1] / revenue * 100) if buyers and revenue else 0

        # Over-limit is judged against the limit of the unit that placed the
        # order (a division has its own), falling back to the parent's.
        limits = {key: u.get("buyerLimit")}
        for d in divisions:
            limits[d["key"]] = d.get("buyerLimit") if d.get("buyerLimit") is not None else u.get("buyerLimit")
        limit = u.get("buyerLimit")
        over_limit = [o for o in os_
                      if limits.get(o["businessUnit"]) and
                      o["totalCents"] > limits[o["businessUnit"]] * 100]
        q = [x for x in quotes if x["businessUnit"] == key]

        accounts.append({
            "key": key,
            "id": u.get("id"),
            "name": u["name"],
            "city": u.get("city"), "state": u.get("state"),
            "contactEmail": u.get("contactEmail"),
            "store": u.get("store"),
            "buyerLimit": limit,
            "limitExceededBehavior": u.get("limitExceededBehavior"),
            "associates": u.get("associates", []),
            "divisions": [{"key": d["key"], "name": d["name"], "buyerLimit": d.get("buyerLimit")}
                          for d in divisions],
            "orderCount": len(os_),
            "revenueCents": revenue,
            "aovCents": round(revenue / len(os_)) if os_ else 0,
            "linesPerOrder": round(sum(o["lineCount"] for o in os_) / len(os_), 1) if os_ else 0,
            "distinctSkus": len(skus),
            "monthly": dict(sorted(months.items())),
            "categories": dict(sorted(cats.items(), key=lambda x: -x[1])),
            "buyers": [{"email": e, "revenueCents": v} for e, v in buyers.most_common()],
            "buyerCount": len(buyers),
            "singleBuyer": len(buyers) == 1,
            "topBuyerSharePct": top_share,
            "effectivelySingleBuyer": len(buyers) == 1 or top_share >= 90,
            "lastOrderAt": last,
            "daysSinceLastOrder": days_since,
            "medianGapDays": median_gap,
            "overdue": overdue,
            "recurringOrders": sum(1 for o in os_ if o["origin"] == "RecurringOrder"),
            "savingsCents": savings,
            "leakageCents": leak,
            "leakageLines": sorted(leak_lines, key=lambda x: -x["overpaidCents"])[:25],
            "overLimitOrders": [
                {"orderNumber": o["orderNumber"], "totalCents": o["totalCents"],
                 "createdAt": o["createdAt"], "buyer": o["customerEmail"],
                 "orderState": o["orderState"], "paymentState": o["paymentState"]}
                for o in over_limit[-10:]
            ],
            "overLimitCount": len(over_limit),
            "quoteCount": len(q),
            "openQuotes": [x for x in q if x["state"] == "Submitted"],
        })

    return sorted(accounts, key=lambda a: -a["revenueCents"])


# --------------------------------------------------------------------------
# Exception desk. Segmented by REASON, because the fix differs per reason —
# a status-only list is something nobody can act on.
# --------------------------------------------------------------------------
REASONS = [
    ("payment-failed",   "Payment failed",       lambda o: o["paymentState"] == "Failed",
     "Card or terms charge was declined. Confirm the payment method with the account, then retry."),
    ("payment-pending",  "Payment pending",      lambda o: o["paymentState"] == "Pending" and o["ageDays"] > 2,
     "Authorised but never captured. Usually a terms account awaiting credit review."),
    ("balance-due",      "Balance due",          lambda o: o["paymentState"] == "BalanceDue",
     "Order shipped with an unpaid balance. Route to AR before the next release."),
    ("awaiting-release", "Awaiting release",     lambda o: o["orderState"] == "Open" and o["ageDays"] > 1,
     "Order was created but never confirmed. Most of these are above a buyer's spend limit."),
    ("ship-pending",     "Shipment pending",     lambda o: o["shipmentState"] == "Pending" and o["ageDays"] > 3,
     "Paid and confirmed but not picked. Check stock and the fulfilment queue."),
    ("ready-not-shipped","Ready, not shipped",   lambda o: o["shipmentState"] == "Ready" and o["ageDays"] > 5,
     "Picked and staged but not dispatched. Usually a carrier booking gap."),
]

def exception_desk(orders, units):
    unit_index = {u["key"]: u for u in units}
    rows = []
    for o in orders:
        if o["orderState"] == "Cancelled":
            continue
        for code, label, test, guidance in REASONS:
            if test(o):
                u = unit_index.get(o["businessUnit"]) or {}
                limit = u.get("buyerLimit")
                rows.append({
                    **{k: o[k] for k in ("id", "orderNumber", "createdAt", "ageDays",
                                         "businessUnit", "customerEmail", "totalCents",
                                         "orderState", "paymentState", "shipmentState",
                                         "poNumber", "lineCount")},
                    "accountName": u.get("name", o["businessUnit"] or "Unassigned"),
                    "reason": code, "reasonLabel": label, "guidance": guidance,
                    "buyerLimitCents": (limit * 100) if limit else None,
                    "overLimit": bool(limit and o["totalCents"] > limit * 100),
                })
                break                      # one reason per order: the most severe match
    # default sort: dollars at risk x age — not status, not date
    rows.sort(key=lambda r: -(r["totalCents"] * max(r["ageDays"], 1)))
    return rows


def sku_rollup(orders, list_rate, contract_rate):
    """Per-SKU view for the catalogue. The interesting column is `spread`:
    how far apart the best and worst price are for the same part across the
    book. A wide spread is either a deliberate tier or a pricing mistake, and
    merchandising cannot tell which without being shown it."""
    agg = collections.defaultdict(lambda: {
        "units": 0, "revenueCents": 0, "accounts": set(), "prices": collections.Counter(),
        "name": None, "brand": None, "category": None, "lastSold": None,
    })
    for o in orders:
        for l in o["lines"]:
            a = agg[l["sku"]]
            a["units"] += l["qty"]
            a["revenueCents"] += l["totalCents"]
            a["name"] = l["name"]; a["brand"] = l["brand"]; a["category"] = l["category"]
            a["prices"][l["unitCents"]] += l["qty"]
            if o["businessUnit"]:
                a["accounts"].add(o["businessUnit"])
            if a["lastSold"] is None or o["createdAt"] > a["lastSold"]:
                a["lastSold"] = o["createdAt"]

    rows = []
    for sku, a in agg.items():
        prices = sorted(a["prices"])
        lo, hi = prices[0], prices[-1]
        rows.append({
            "sku": sku, "name": a["name"], "brand": a["brand"], "category": a["category"],
            "units": a["units"], "revenueCents": a["revenueCents"],
            "accountCount": len(a["accounts"]),
            "lowestCents": lo, "listCents": hi,
            "spreadPct": round((hi - lo) / hi * 100) if hi else 0,
            "priceCount": len(prices),
            "lastSold": a["lastSold"],
        })
    return sorted(rows, key=lambda r: -r["revenueCents"])


def main():
    global AS_OF
    raw_orders, raw_quotes, units = load_raw()
    AS_OF = max(dt(business_date(o)) for o in raw_orders)
    orders = normalise_orders(raw_orders)
    quotes = normalise_quotes(raw_quotes)
    list_rate, contract_rate = price_model(orders)
    accounts = account_rollup(orders, quotes, units, list_rate, contract_rate)
    exceptions = exception_desk(orders, units)
    skus = sku_rollup(orders, list_rate, contract_rate)

    total_rev = sum(o["totalCents"] for o in orders)
    monthly = collections.defaultdict(int)
    cats = collections.defaultdict(int)
    for o in orders:
        monthly[o["month"]] += o["totalCents"]
        for l in o["lines"]:
            cats[l["category"]] += l["totalCents"]

    # Compare the last COMPLETE month against the one before it.
    #
    # "Complete" is a property of the DATA, not of the wall clock. The previous
    # version asked whether today was early in the month, which meant the same
    # dataset reported a different story depending on when you looked at it:
    # a snapshot ending 2 Oct read correctly on 3 Oct and, untouched, reported a
    # $1.06M month-over-month collapse on 27 Oct. Nothing had changed but the date.
    #
    # A month is partial when the data stops before the month does.
    months = sorted(monthly)
    last_month = months[-1]
    y, m = int(last_month[:4]), int(last_month[5:7])
    days_in_last_month = calendar.monthrange(y, m)[1]
    covers_whole_month = (AS_OF.year, AS_OF.month) != (y, m) or AS_OF.day >= days_in_last_month
    partial = None if covers_whole_month else last_month

    complete = [x for x in months if x != partial]
    cur, prev = complete[-1], complete[-2]

    # This project's order history is not evenly spread. Say so in the data
    # rather than letting the UI imply a trend that is not there — a
    # month-over-month figure against a month holding most of the year is
    # arithmetic, not insight.
    # Mass-quiet detection.
    #
    # One account going quiet is a churn signal. Half the book going quiet in
    # the same week is a data signal: an export that stopped, a feed that
    # broke, a seed that ended. Firing 47 individual churn alerts in that
    # situation is worse than firing none, because it teaches the person
    # reading the queue that the queue is noise.
    #
    # So we detect the cluster and let the UI say one true thing instead.
    overdue_accts = [a for a in accounts if a["overdue"] and a["orderCount"] > 0]
    trading = [a for a in accounts if a["orderCount"] > 0]
    overdue_share = round(len(overdue_accts) / len(trading) * 100) if trading else 0
    last_dates = sorted(a["lastOrderAt"][:10] for a in overdue_accts if a["lastOrderAt"])
    quiet_cluster = {
        "accounts": len(overdue_accts),
        "ofAccounts": len(trading),
        "sharePct": overdue_share,
        "earliestLastOrder": last_dates[0] if last_dates else None,
        "latestLastOrder": last_dates[-1] if last_dates else None,
        # The tell is not how far apart the quiet accounts are overall — a few
        # genuinely dormant ones stretch that out. It is whether most of them
        # stop against the SAME edge: the point where the data runs out.
        "cliffDate": last_dates[-1] if last_dates else None,
        "atCliff": sum(
            1 for d in last_dates
            if (datetime.fromisoformat(last_dates[-1]) - datetime.fromisoformat(d)).days <= 14
        ),
        "clustered": bool(
            last_dates
            and overdue_share >= 50
            and sum(1 for d in last_dates
                    if (datetime.fromisoformat(last_dates[-1]) - datetime.fromisoformat(d)).days <= 14)
               >= 0.6 * len(last_dates)
        ),
        "revenueCents": sum(a["revenueCents"] for a in overdue_accts),
    }

    peak_month = max(monthly, key=lambda m: monthly[m])
    peak_share = round(monthly[peak_month] / total_rev * 100) if total_rev else 0
    moved = []
    for a in accounts:
        d = a["monthly"].get(cur, 0) - a["monthly"].get(prev, 0)
        if d:
            moved.append({"name": a["name"], "key": a["key"], "kind": "account",
                          "deltaCents": d, "currentCents": a["monthly"].get(cur, 0)})
    moved.sort(key=lambda x: -abs(x["deltaCents"]))

    snapshot = {
        # AS_OF is the latest TRADING date in the data — the horizon of what we
        # know. It is not "now". The UI compares it against the real clock and
        # says plainly how old the picture is.
        "generatedAt": AS_OF.isoformat(),
        "dataAsOf": AS_OF.isoformat(),
        "project": "demo-orium-b2b",
        "currency": "USD",
        "window": {"from": orders[0]["createdAt"][:10], "to": orders[-1]["createdAt"][:10],
                   "currentMonth": cur, "priorMonth": prev, "partialMonth": partial},
        "totals": {
            "revenueCents": total_rev,
            "orderCount": len(orders),
            "aovCents": round(total_rev / len(orders)),
            "activeAccounts": sum(1 for a in accounts if a["orderCount"] > 0),
            "monthly": dict(sorted(monthly.items())),
            "categories": dict(sorted(cats.items(), key=lambda x: -x[1])),
            "savingsCents": sum(a["savingsCents"] for a in accounts),
            "leakageCents": sum(a["leakageCents"] for a in accounts),
            "exceptionCount": len(exceptions),
            "exceptionValueCents": sum(e["totalCents"] for e in exceptions),
            "openQuoteCount": sum(len(a["openQuotes"]) for a in accounts),
            "quietCluster": quiet_cluster,
            "peakMonth": peak_month,
            "peakMonthSharePct": peak_share,
            "monthlyComparable": peak_share < 60,
        },
        "whatMoved": moved[:8],
        "accounts": accounts,
        "exceptions": exceptions,
        "skus": skus,
        "brands": dict(sorted(
            collections.Counter({b: sum(r["revenueCents"] for r in skus if r["brand"] == b)
                                 for b in {r["brand"] for r in skus if r["brand"]}}).items(),
            key=lambda x: -x[1])),
        "quotes": quotes,
        "orders": [{k: o[k] for k in ("id", "orderNumber", "createdAt", "month", "ageDays",
                                      "businessUnit", "customerEmail", "orderState",
                                      "paymentState", "shipmentState", "origin",
                                      "poNumber", "totalCents", "lineCount")} for o in orders],
        "definitions": DEFINITIONS,
    }

    out = os.path.join(ROOT, "data", "snapshot.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(snapshot, open(out, "w"), indent=1)

    print(f"wrote {out}")
    print(f"  orders           {len(orders)}  ({snapshot['window']['from']} -> {snapshot['window']['to']})")
    print(f"  accounts         {len(accounts)}")
    print(f"  revenue          ${money(total_rev):,.2f}")
    print(f"  contract savings ${money(snapshot['totals']['savingsCents']):,.2f}")
    print(f"  contract leakage ${money(snapshot['totals']['leakageCents']):,.2f}")
    print(f"  exceptions       {len(exceptions)}  worth ${money(snapshot['totals']['exceptionValueCents']):,.2f}")
    print(f"  open quotes      {snapshot['totals']['openQuoteCount']}")
    print()
    for a in accounts[:6]:
        print(f"  {a['name'][:34]:34} ${money(a['revenueCents']):>12,.2f}  "
              f"orders {a['orderCount']:>3}  buyers {a['buyerCount']}  "
              f"leak ${money(a['leakageCents']):>9,.2f}  "
              f"{'OVERDUE' if a['overdue'] else ''}")


DEFINITIONS = {
  "revenue": "Sum of order totals (tax and shipping included) for orders placed in the window.",
  "contractSavings": "For every line: (highest unit price seen for that SKU anywhere) minus (price this account actually paid), times quantity. What the negotiated rate has been worth.",
  "contractLeakage": "For every line: (price paid) minus (lowest unit price this same account has ever paid for that SKU), times quantity, counted only when positive. Money left on the table at this account's own agreed rate. It never compares an account to a rate it was not offered.",
  "reorderCadence": "Median number of days between consecutive orders. An account is flagged overdue when days since its last order exceed 1.5x that median.",
  "buyerConcentration": "Count of distinct buyer email addresses that have placed an order. One buyer means the account stops if that person leaves — continuity risk for the customer, account risk for Keystone.",
  "exceptionValue": "Order value sitting in a non-terminal state past its reason-specific age threshold. This is revenue that has stopped moving.",
  "overLimit": "Order total above the business unit's buyerLimit custom field. With limitExceededBehavior = pending these require an approver before release.",
  "quoteAge": "Days since the quote request was submitted. Quotes older than 3 days convert materially worse.",
}


if __name__ == "__main__":
    main()
