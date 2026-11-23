"""Parsing Z-Anatomy object names into structure ids (pure Python, no bpy)."""
import re
import unicodedata
from typing import Literal, NamedTuple, Optional

# Top-level Blender collections exported as atlas layers, in display order.
COLLECTION_TO_SYSTEM = {
    "1: Skeletal system": "bones",
    "3: Joints": "joints",
    "4: Muscular system": "muscles",
    "5: Cardiovascular system": "vessels",
    "7: Nervous system & Sense organs": "nerves",
    "8: Visceral systems": "organs",
}
SYSTEM_ORDER = list(COLLECTION_TO_SYSTEM.values())

HELPER_SUFFIX = re.compile(r"\.(g|j|i|s|t)$")
SIDE_SUFFIX = re.compile(r"\.(l|r)$")


class ParsedName(NamedTuple):
    base: str
    side: Optional[Literal["l", "r"]]


def parse_object_name(name: str) -> Optional[ParsedName]:
    """Split 'Palatine bone.l' into ('Palatine bone', 'l'); None for label helpers."""
    name = name.strip()
    if HELPER_SUFFIX.search(name):
        return None
    side = None
    m = SIDE_SUFFIX.search(name)
    if m:
        side = m.group(1)
        name = name[: m.start()]
    name = name.strip()
    if name.startswith("(") and name.endswith(")"):
        name = name[1:-1]
    name = name.strip().rstrip("'*.").strip()
    if "?" in name or not re.search(r"[A-Za-z]{2}", name):
        return None
    return ParsedName(name, side)


def slugify(base: str) -> str:
    """ASCII id safe for three.js node names: [a-z0-9]+(_[a-z0-9]+)*."""
    s = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "_", s.lower())
    return s.strip("_")


def node_name(id: str, side: Optional[str]) -> str:
    return f"{id}__{side}" if side else id
