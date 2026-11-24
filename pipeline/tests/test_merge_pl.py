import pytest
from pipeline.merge_pl import apply_pl, check_pl

ROW = {"id": "femur", "system": "bones", "pl": "", "en": "Femur", "la": "Femur", "pl_status": "do_weryfikacji"}


def test_apply_fills_only_pl():
    rows = [dict(ROW), {**ROW, "id": "tibia", "en": "Tibia"}]
    out = apply_pl(rows, {"femur": "Kość udowa"})
    assert out[0] == {**ROW, "pl": "Kość udowa"}
    assert out[1]["pl"] == ""


def test_apply_does_not_touch_verified():
    rows = [{**ROW, "pl": "Kość udowa", "pl_status": "zweryfikowane"}]
    assert apply_pl(rows, {"femur": "Inna"})[0]["pl"] == "Kość udowa"


def test_apply_unknown_id_fails():
    with pytest.raises(KeyError):
        apply_pl([dict(ROW)], {"nope": "X"})


def test_check_reports_empty_and_side_words():
    rows = [dict(ROW), {**ROW, "id": "a", "pl": "Kość lewa"}, {**ROW, "id": "b", "pl": "Rzepka"}]
    problems = check_pl(rows, ["bones"])
    assert problems["empty"] == ["femur"]
    assert problems["side_words"] == ["a"]
