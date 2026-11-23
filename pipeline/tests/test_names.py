import re
from pipeline.names import parse_object_name, slugify, node_name


def test_side_suffixes():
    assert parse_object_name("Palatine bone.l") == ("Palatine bone", "l")
    assert parse_object_name("Palatine bone.r") == ("Palatine bone", "r")
    assert parse_object_name("Right ventricle") == ("Right ventricle", None)


def test_helpers_skipped():
    for n in ["Costal arch.j", "Body of pubis.i", "Body of pubis.s", "Atlas.t", "Heart.g", "?x"]:
        assert parse_object_name(n) is None


def test_parentheses_stripped():
    assert parse_object_name("(Deep branch of transverse cervical artery).l") == (
        "Deep branch of transverse cervical artery", "l")
    assert parse_object_name("(Iliopectineal bursa).r").base == "Iliopectineal bursa"


def test_inner_parentheses_kept_as_text():
    assert parse_object_name("Atlas (C1)").base == "Atlas (C1)"


def test_trailing_punctuation():
    assert parse_object_name("Central canal'").base == "Central canal"
    assert parse_object_name("Anterior occipital sulcus*").base == "Anterior occipital sulcus"


def test_slugify():
    assert slugify("Atlas (C1)") == "atlas_c1"
    assert slugify("Anterior meniscotibial ligament (Lateral meniscus)") == \
        "anterior_meniscotibial_ligament_lateral_meniscus"
    assert slugify("Zygomatico-orbital  artery") == "zygomatico_orbital_artery"
    assert slugify("Posterior lateral nasal branches of sphenopalatine artery.") == \
        "posterior_lateral_nasal_branches_of_sphenopalatine_artery"


def test_slugify_non_ascii():
    assert slugify("Ganglion of Corti – spiral") == "ganglion_of_corti_spiral"
    assert slugify("Müller muscle") == "muller_muscle"


def test_slug_is_loader_safe():
    for s in ["Atlas (C1)", "Fourth rib", "M3 segment / x", "a__b", "_x_"]:
        assert re.fullmatch(r"[a-z0-9]+(_[a-z0-9]+)*", slugify(s))


def test_node_name():
    assert node_name("palatine_bone", "l") == "palatine_bone__l"
    assert node_name("palatine_bone", "r") == "palatine_bone__r"
    assert node_name("heart", None) == "heart"
