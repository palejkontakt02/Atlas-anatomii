"""Terminologia Anatomica 2 (TA2.csv from Z-Anatomy) and exclusion lists."""
import re
from pathlib import Path


def load_ta2(path) -> dict:
    """English (lowercased) -> Latin. File: BOM, each line quoted whole, ';'-separated."""
    out = {}
    lines = Path(path).read_text(encoding="utf-8-sig").splitlines()
    for line in lines[1:]:
        parts = line.strip().strip('"').split(";")
        if len(parts) < 3:
            continue
        en, la = parts[1].strip().lower(), parts[2].strip()
        if en and la:
            out.setdefault(en, la)
    return out


def load_exclusions(path) -> list:
    pats = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            pats.append(re.compile(line, re.IGNORECASE))
    return pats


def is_excluded(base: str, patterns) -> bool:
    return any(p.search(base) for p in patterns)
