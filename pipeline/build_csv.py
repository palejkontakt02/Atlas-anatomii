"""Scala build/raw/*.names.json + TA2 w data/structures.csv, nie ruszając istniejących wierszy.

  python3 -I pipeline/build_csv.py
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline.names import SYSTEM_ORDER  # noqa: E402
from pipeline.ta2 import load_ta2  # noqa: E402

COLUMNS = ["id", "system", "pl", "en", "la", "pl_status"]


def _sort_key(row):
    s = row["system"]
    return (SYSTEM_ORDER.index(s) if s in SYSTEM_ORDER else len(SYSTEM_ORDER), row["en"].lower())


def merge_rows(existing, found, ta2):
    rows = {r["id"]: r for r in existing}
    for f in found:
        if f["id"] in rows:
            continue
        base = f["base"]
        rows[f["id"]] = {
            "id": f["id"], "system": f["system"], "pl": "", "en": base[:1].upper() + base[1:],
            "la": ta2.get(base.lower(), ""), "pl_status": "do_weryfikacji",
        }
    return sorted(rows.values(), key=_sort_key)


def read_csv(path):
    path = Path(path)
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [{k: (r.get(k) or "") for k in COLUMNS} for r in csv.DictReader(f)]


def write_csv(path, rows):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(rows)


def main():
    found = []
    for system in SYSTEM_ORDER:
        p = ROOT / "build" / "raw" / f"{system}.names.json"
        if p.exists():
            found += json.loads(p.read_text(encoding="utf-8"))
    ta2 = load_ta2(ROOT / "build" / "source" / "TA2.csv")
    out = ROOT / "data" / "structures.csv"
    rows = merge_rows(read_csv(out), found, ta2)
    write_csv(out, rows)
    for system in SYSTEM_ORDER:
        rs = [r for r in rows if r["system"] == system]
        print(f"{system}: {len(rs)} wierszy, bez łaciny: {sum(1 for r in rs if not r['la'])}")
    print(f"razem: {len(rows)} -> {out}")


if __name__ == "__main__":
    main()
