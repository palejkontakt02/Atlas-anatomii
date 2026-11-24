"""Wpisuje polskie nazwy (plik TSV: id<TAB>pl) do data/structures.csv i sprawdza wynik.

  python3 -I pipeline/merge_pl.py translations.tsv            # scal
  python3 -I pipeline/merge_pl.py --check bones,joints         # tylko sprawdź
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline.build_csv import read_csv, write_csv  # noqa: E402

SIDE_WORDS = re.compile(r"\b(lew[aey]|praw[aey]|left|right)\b", re.IGNORECASE)
SOURCE_SIDE = re.compile(r"\b(left|right|dext\w*|sinist\w*)\b", re.IGNORECASE)
CSV = ROOT / "data" / "structures.csv"


def apply_pl(rows, translations):
    ids = {r["id"] for r in rows}
    unknown = [k for k in translations if k not in ids]
    if unknown:
        raise KeyError(f"nieznane id: {unknown[:10]}")
    out = []
    for r in rows:
        r = dict(r)
        if r["pl_status"] != "zweryfikowane" and r["id"] in translations:
            r["pl"] = translations[r["id"]].strip()
        out.append(r)
    return out


def check_pl(rows, systems):
    sel = [r for r in rows if r["system"] in systems]
    return {
        "empty": [r["id"] for r in sel if not r["pl"]],
        "side_words": [r["id"] for r in sel if SIDE_WORDS.search(r["pl"]) and not SOURCE_SIDE.search(r["en"] + " " + r["la"])],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tsv", nargs="?")
    ap.add_argument("--check", default="")
    args = ap.parse_args()
    rows = read_csv(CSV)
    if args.tsv:
        tr = {}
        for line in Path(args.tsv).read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#"):
                k, v = line.split("\t", 1)
                tr[k.strip()] = v
        before = len(rows)
        rows = apply_pl(rows, tr)
        assert len(rows) == before
        write_csv(CSV, rows)
        print(f"scalono {len(tr)} nazw")
    if args.check:
        p = check_pl(rows, args.check.split(","))
        print(f"puste pl: {len(p['empty'])} {p['empty'][:40]}")
        print(f"słowa strony w pl: {p['side_words']}")
        sys.exit(1 if p["side_words"] else 0)


if __name__ == "__main__":
    main()
