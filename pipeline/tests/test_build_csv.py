from pipeline.build_csv import merge_rows, read_csv, write_csv


def F(id, base, side=None, system="bones"):
    return {"id": id, "base": base, "side": side, "system": system}


def test_new_row_gets_en_la_and_status():
    rows = merge_rows([], [F("palatine_bone", "Palatine bone", "l")], {"palatine bone": "Os palatinum"})
    assert rows == [{"id": "palatine_bone", "system": "bones", "pl": "", "en": "Palatine bone",
                     "la": "Os palatinum", "pl_status": "do_weryfikacji"}]


def test_en_first_letter_capitalized():
    assert merge_rows([], [F("atlas_c1", "atlas (C1)")], {})[0]["en"] == "Atlas (C1)"


def test_existing_edits_preserved():
    old = [{"id": "palatine_bone", "system": "bones", "pl": "Kość podniebienna", "en": "Palatine bone",
            "la": "Os palatinum", "pl_status": "zweryfikowane"}]
    assert merge_rows(old, [F("palatine_bone", "Palatine bone", "r")], {}) == old


def test_missing_ta2_leaves_la_empty():
    assert merge_rows([], [F("x_y", "X y", system="nerves")], {})[0]["la"] == ""


def test_rows_gone_from_model_are_kept():
    old = [{"id": "gone", "system": "bones", "pl": "A", "en": "A", "la": "", "pl_status": "do_weryfikacji"}]
    assert merge_rows(old, [], {}) == old


def test_same_id_in_two_systems_keeps_first():
    found = [F("a", "A", system="bones"), F("a", "A", system="joints")]
    assert [r["system"] for r in merge_rows([], found, {})] == ["bones"]


def test_sorted_by_system_order_then_en():
    found = [F("b", "Beta", system="muscles"), F("z", "Zeta", system="bones"), F("a", "Alpha", system="muscles")]
    assert [r["id"] for r in merge_rows([], found, {})] == ["z", "a", "b"]


def test_roundtrip_bom_and_commas(tmp_path):
    rows = [{"id": "a", "system": "bones", "pl": "Więzadło, przednie", "en": "A", "la": "",
             "pl_status": "do_weryfikacji"}]
    write_csv(tmp_path / "s.csv", rows)
    assert (tmp_path / "s.csv").read_bytes().startswith(b"\xef\xbb\xbf")
    assert read_csv(tmp_path / "s.csv") == rows


def test_read_missing_file_is_empty(tmp_path):
    assert read_csv(tmp_path / "nope.csv") == []
