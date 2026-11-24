"""Eksport warstw Z-Anatomy do glb (uruchamiać przez bpy):

  .venv/bin/python -I pipeline/export_systems.py build/source/Z-Anatomy/Startup.blend [--inventory] [--only bones,...]

Każda struktura to osobny, płaski węzeł w world space; nazwa węzła = <id>[__l|__r],
extras = {name, tissue}. Obok glb powstaje <system>.names.json dla build_csv.py.
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import bpy  # noqa: E402
import bmesh  # noqa: E402  (dostępny dopiero po imporcie bpy)

from pipeline.names import COLLECTION_TO_SYSTEM, node_name, parse_object_name, slugify  # noqa: E402
from pipeline.ta2 import is_excluded, load_exclusions  # noqa: E402

OUT = ROOT / "build" / "raw"
MIN_VERTS = 4


def tissue_of(obj) -> str:
    m = obj.active_material
    return m.name.lower() if m else ""


def collect(exclusions):
    """{system: {node: [entries]}} plus inventory rows."""
    systems, rows = {}, []
    for col_name, system in COLLECTION_TO_SYSTEM.items():
        col = bpy.data.collections[col_name]
        nodes = systems.setdefault(system, {})
        for obj in col.all_objects:
            if obj.type not in ("MESH", "CURVE"):
                continue
            parsed = parse_object_name(obj.name)
            if parsed is None:
                continue
            excluded = is_excluded(parsed.base, exclusions)
            verts = len(obj.data.vertices) if obj.type == "MESH" else -1
            rows.append((system, parsed.base, parsed.side or "", obj.type, verts, tissue_of(obj),
                         "|".join(c.name for c in obj.users_collection), "EXCLUDED" if excluded else ""))
            if excluded or (obj.type == "MESH" and verts < MIN_VERTS):
                continue
            if obj.type == "CURVE" and obj.data.bevel_depth == 0 and obj.data.bevel_object is None:
                continue  # linie pomocnicze bez grubości (np. równik gałki ocznej)
            sid = slugify(parsed.base)
            if not sid:
                continue
            nodes.setdefault(node_name(sid, parsed.side), []).append(
                {"obj": obj, "id": sid, "base": parsed.base, "side": parsed.side})
    return systems, rows


MATERIALS = {}


def material_named(name, fallback):
    """One Blender material per Z-Anatomy material name, with a colour derived from the name
    so that gltf-transform's dedup cannot merge (and rename) different materials."""
    key = name or fallback
    mat = MATERIALS.get(key)
    if mat is None:
        mat = bpy.data.materials.new(f"atlas:{key}")
        h = sum(ord(c) * (i + 1) for i, c in enumerate(key)) % 997  # deterministic, unlike hash()
        rgb = (0.3 + (h % 10) / 30, 0.3 + (h // 10 % 10) / 30, 0.3 + (h // 100) / 30, 1.0)
        mat.use_nodes = True
        mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = rgb
        mat.diffuse_color = rgb
        MATERIALS[key] = mat
    return mat


def build_mesh(entries, depsgraph, name):
    """Merge the entries into one mesh in world space, keeping each face's Z-Anatomy material slot."""
    bm = bmesh.new()
    names = []
    for e in entries:
        obj = e["obj"]
        m = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), preserve_all_data_layers=False,
                                            depsgraph=depsgraph)
        m.transform(obj.matrix_world)
        slots = [s.material.name.lower() if s.material else "" for s in obj.material_slots] or [""]
        remap = []
        for sn in slots:
            if sn not in names:
                names.append(sn)
            remap.append(names.index(sn))
        for poly in m.polygons:
            poly.material_index = remap[poly.material_index if poly.material_index < len(remap) else 0]
        bm.from_mesh(m)
        bpy.data.meshes.remove(m)
    if len(bm.verts) < MIN_VERTS or len(bm.faces) == 0:
        bm.free()
        return None, []
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me, names


def export_system(system, nodes, depsgraph):
    scene = bpy.data.scenes.new(f"export_{system}")
    names = []
    for nname, entries in sorted(nodes.items()):
        me, slot_names = build_mesh(entries, depsgraph, nname)
        if me is None:
            continue
        tissue = tissue_of(entries[0]["obj"])
        # (bez materials.clear(): czyszczenie slotów zeruje przypisanie ścian do materiałów)
        for sn in slot_names:
            me.materials.append(material_named(sn, system))
        ob = bpy.data.objects.new(nname, me)
        ob["name"] = entries[0]["base"]
        ob["tissue"] = tissue
        scene.collection.objects.link(ob)
        e = entries[0]
        names.append({"id": e["id"], "base": e["base"], "side": e["side"], "system": system})
    path = OUT / f"{system}.glb"
    with bpy.context.temp_override(scene=scene):
        bpy.ops.export_scene.gltf(
            filepath=str(path), export_format="GLB", use_active_scene=True, export_extras=True,
            export_normals=True, export_texcoords=False, export_materials="EXPORT",
            export_apply=True, export_yup=True)
    (OUT / f"{system}.names.json").write_text(json.dumps(names, ensure_ascii=False, indent=0))
    print(f"[export] {system}: {len(names)} nodes -> {path}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("blend")
    ap.add_argument("--inventory", action="store_true")
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=args.blend, load_ui=False)
    exclusions = load_exclusions(ROOT / "pipeline" / "exclusions.txt")
    for obj in bpy.data.objects:
        if obj.type == "CURVE":
            obj.data.resolution_u = 2
            obj.data.bevel_resolution = 1
    systems, rows = collect(exclusions)
    if args.inventory:
        with open(OUT / "inventory.tsv", "w", encoding="utf-8") as f:
            f.write("system\tbase\tside\ttype\tverts\ttissue\tcollections\texcluded\n")
            for r in rows:
                f.write("\t".join(map(str, r)) + "\n")
        print(f"[inventory] {len(rows)} rows -> {OUT / 'inventory.tsv'}")
        return
    depsgraph = bpy.context.evaluated_depsgraph_get()
    only = [s for s in args.only.split(",") if s]
    for system, nodes in systems.items():
        if not only or system in only:
            export_system(system, nodes, depsgraph)


if __name__ == "__main__":
    main()
