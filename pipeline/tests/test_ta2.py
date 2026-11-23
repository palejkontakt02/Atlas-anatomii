from pipeline.ta2 import load_ta2, load_exclusions, is_excluded


def test_load_ta2(tmp_path):
    p = tmp_path / "TA2.csv"
    p.write_text('﻿"TA2ID;English;Latin;Français"\n"2;Vertical;Verticalis;Vertical"\n'
                 '"9;Vertical;Inny;X"\n"10;Palatine bone ;Os palatinum;Y"\n', encoding="utf-8")
    assert load_ta2(p) == {"vertical": "Verticalis", "palatine bone": "Os palatinum"}


def test_exclusions(tmp_path):
    p = tmp_path / "ex.txt"
    p.write_text("# NC\n^cochlea\n\n^kidney$\n")
    pats = load_exclusions(p)
    assert is_excluded("Cochlea", pats)
    assert is_excluded("Kidney", pats)
    assert not is_excluded("Kidney stone", pats)
    assert not is_excluded("Femur", pats)
