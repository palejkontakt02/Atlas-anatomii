# Atlas anatomii 3D: plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statyczna strona (GitHub Pages) z modelem 3D całego ciała z Z-Anatomy, warstwami układów, klikaniem struktur i nazwami PL / ENG / łac. z wyszukiwarką.

**Architecture:** Dwie części. (1) `pipeline/` w Pythonie (bpy 5.3.0) uruchamiany ręcznie: pobiera `Startup.blend` z Z-Anatomy, eksportuje osobny, spłaszczony plik `.glb` per układ (węzeł = jedna struktura, nazwa węzła = id), kompresuje go Meshopt przez gltf-transform i generuje/scala `data/structures.csv` (EN z modelu, łac. z TA2). (2) Przeglądarka w czystym JS (three.js + Vite): wczytuje CSV i warstwy na żądanie, raycast na kliknięcie, panel z nazwami, wyszukiwarka, ukrywanie/izolacja.

**Tech Stack:** Python 3.13 + `bpy==5.3.0` + pytest (pipeline); Node 22, `three`, `papaparse`, Vite, Vitest, `@gltf-transform/cli` + `@gltf-transform/core`, Playwright (smoke test, przeglądarka preinstalowana); GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-24-atlas-anatomii-design.md`

## Ustalenia z rozpoznania źródła (2026-11-23)

- Źródło: `https://github.com/Z-Anatomy/Models-of-human-anatomy`, commit `e3cf19896db825a5c8a9df461e3cd74c96f94ec3`: `Z-Anatomy.zip` (w środku `Z-Anatomy/Startup.blend`, 307 MB), `TA2.csv` (separator `;`, kolumny `TA2ID;English;Latin;...`, BOM, pola w cudzysłowie całą linią), `License.txt` (CC BY-SA 4.0, potwierdzone).
- Kolekcje najwyższego poziomu → warstwy v1: `1: Skeletal system` → `bones`, `3: Joints` → `joints`, `4: Muscular system` → `muscles`, `5: Cardiovascular system` → `vessels`, `7: Nervous system & Sense organs` → `nerves`, `8: Visceral systems` → `organs`. Pomijamy w v1: `2: Muscular insertions` (przyczepy, poza zakresem), `6: Lymphoid organs`, `9: Regions of human body`, kolekcje pomocnicze.
- Nazwy obiektów są angielskie z sufiksami: `.l`/`.r` = strona; `.j .i .s .t .g` = obiekty pomocnicze etykiet (pomijamy); nawiasy `(…)` = struktura podrzędna (nawiasy usuwamy z nazwy). Naczynia i część nerwów to obiekty `CURVE` z `bevel_depth`. ~97% nazw bazowych trafia w kolumnę English TA2.
- **Licencja:** `License.txt` wymienia modele na licencji NC: „Anatomy of the Inner Ear (Univ. of Dundee) CC-BY-NC-SA 4.0” i „Kidney (Lissie Cowley) CC-BY-NC 4.0”. Domyślnie wykluczamy je z eksportu (`pipeline/exclusions.txt`), żeby całość była czystym CC BY-SA. Decyzja należy do Seby (patrz przekazanie).

## Global Constraints

- Nazwy w trzech językach: `pl`, `en`, `la`; domyślny język interfejsu i głównej nazwy: polski.
- `data/structures.csv`: kolumny dokładnie `id,system,pl,en,la,pl_status`; `pl_status` ∈ {`do_weryfikacji`, `zweryfikowane`}; zapis UTF-8 z BOM, separator `,`, CRLF wolno. Każda nowa polska nazwa ma `do_weryfikacji`, a w atlasie widać przy niej dyskretny znacznik „do weryfikacji”.
- Id struktury: `[a-z0-9_]+`, bez `__` w środku, bez `_` na początku i końcu. Nazwa węzła w `.glb`: `<id>`, `<id>__l` albo `<id>__r`. Jeden wiersz CSV na strukturę (strony lewa/prawa dzielą wiersz). To świadome doprecyzowanie spec („id = identyfikator obiektu w modelu”): obiekt modelu = id + opcjonalny sufiks strony.
- Wczytywanie warstw na żądanie; domyślnie włączone tylko `bones`. Żaden plik w repo nie może przekroczyć 100 MB; cel: każdy `.glb` ≤ 20 MB, `bones.glb` ≤ 8 MB.
- three.js bez frameworka UI. Wszystkie zależności przypięte dokładnie (`--save-exact`).
- Stopka z autorami i licencją zawsze widoczna (tekst w Task 8). Model i dane: CC BY-SA 4.0.
- Hosting: GitHub Pages, publiczne repo `palejkontakt02/atlas-anatomii`. Zero kosztów.
- Pliki źródłowe Z-Anatomy (`.blend`, zip) nie trafiają do repo (katalog `build/` w `.gitignore`).

## Review Focus

1. **Nazwy węzłów po GLTFLoader:** three.js przepuszcza nazwy przez `PropertyBinding.sanitizeNodeName` (usuwa `.`, `:`, `/`, `[]`, spacje → `_`). Każde id musi przejść przez nią bez zmiany, inaczej klik nie znajdzie wiersza w CSV. Testy: Task 1 (slug) i Task 4 (`sanitizeNodeName(id) === id` dla każdego wiersza CSV).
2. **Wyszukiwanie bez polskich znaków i w innej wielkości liter:** „posladkowy sredni”, „GLUTEUS MEDIUS”, „glutaeus” muszą znaleźć mięsień pośladkowy średni. Test: Task 5.
3. **CSV po zapisie w polskim Excelu:** separator `;`, BOM, CRLF, przecinki w nazwach w cudzysłowie. Strona ma to dalej czytać. Test: Task 4.
4. **Obracanie palcem a kliknięcie:** przeciągnięcie przy obracaniu nie może zaznaczać struktury, a dotknięcie cienkiego nerwu lub naczynia ma go trafić z tolerancją. Testy: Task 7 (`isTap`, `pickWithTolerance`).
5. **Szybkie przełączanie warstw i wybór z wyszukiwarki struktury z niewczytanej warstwy:** wczytanie ma się odbyć raz, stan widoczności ma się zgadzać z ostatnim kliknięciem, a wybór z wyszukiwarki ma wczytać warstwę i zaznaczyć strukturę. Testy: Task 6.

---

## Struktura plików

```
pipeline/
  requirements.txt        bpy==5.3.0, pytest
  names.py                parsowanie nazw Z-Anatomy, slug, filtr pomocników (czysty Python)
  ta2.py                  wczytanie TA2.csv → słownik en→łac.
  exclusions.txt          regexy nazw wykluczonych (licencje NC), z komentarzem
  fetch_source.sh         pobranie źródła w przypiętym commicie do build/source/
  export_systems.py       bpy: blend → build/raw/<system>.glb + build/raw/<system>.names.json
  compress.sh             gltf-transform → public/models/<system>.glb
  build_csv.py            scalanie build/raw/*.names.json + TA2 → data/structures.csv
  tests/test_names.py, tests/test_ta2.py, tests/test_build_csv.py
data/structures.csv
public/models/{bones,joints,muscles,vessels,nerves,organs}.glb
src/
  config.js               SYSTEMS, kolory, teksty UI pl/en
  structures.js           parseStructures, resolveMeshName, displayName
  search.js               normalize, searchStructures
  layers.js               LayerManager
  viewer.js               scena, materiały, picking, zaznaczenie, widoczność
  pick.js                 isTap, pickWithTolerance (bez WebGL)
  visibility.js           hide / isolate / showAll
  ui.js                   panel warstw, panel info / bottom sheet, wyszukiwarka, przełącznik języka
  main.js                 spięcie całości
  style.css
index.html, vite.config.js, package.json
tests/*.test.js           Vitest
e2e/smoke.spec.js         Playwright
scripts/check-data.mjs    spójność .glb ↔ CSV
.github/workflows/pages.yml
LICENSE, LICENSE-content.md, README.md
```

---

### Task 1: Rusztowanie repo i czyste funkcje pipeline'u

**Files:**
- Create: `.gitignore` (`build/`, `node_modules/`, `dist/`, `.venv/`, `__pycache__/`), `package.json`, `pipeline/requirements.txt`, `pipeline/names.py`, `pipeline/ta2.py`, `pipeline/exclusions.txt`
- Test: `pipeline/tests/test_names.py`, `pipeline/tests/test_ta2.py`

**Interfaces:**
- Produces:
  - `parse_object_name(name: str) -> ParsedName | None`, gdzie `ParsedName = NamedTuple(base: str, side: Literal['l','r'] | None)`. Zwraca `None` dla pomocników (sufiks `.g .j .i .s .t`) i nazw bez liter (np. `?x`).
  - `slugify(base: str) -> str`: id zgodne z Global Constraints.
  - `node_name(id: str, side: str | None) -> str`: `id`, `id__l`, `id__r`.
  - `load_ta2(path) -> dict[str, str]` (klucz: angielska nazwa małymi literami, wartość: łacina; pierwszy wpis wygrywa).
  - `load_exclusions(path) -> list[re.Pattern]`, `is_excluded(base: str, patterns) -> bool`.

- [ ] **Step 1: `npm init -y`, ustaw `"type": "module"`, `"private": true`; zainstaluj `--save-exact -D vite vitest @gltf-transform/cli @gltf-transform/core @gltf-transform/extensions meshoptimizer @playwright/test` i `--save-exact three papaparse`. Venv: `python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt`.**

- [ ] **Step 2: Napisz testy**

```python
# test_names.py
def test_side_suffixes():
    assert parse_object_name("Palatine bone.l") == ("Palatine bone", "l")
    assert parse_object_name("Right ventricle") == ("Right ventricle", None)
def test_helpers_skipped():
    for n in ["Costal arch.j", "Body of pubis.i", "Body of pubis.s", "Atlas.t", "Heart.g", "?x"]:
        assert parse_object_name(n) is None
def test_parentheses_stripped():
    assert parse_object_name("(Deep branch of transverse cervical artery).l") == ("Deep branch of transverse cervical artery", "l")
    assert parse_object_name("(Iliopectineal bursa).r").base == "Iliopectineal bursa"
def test_trailing_punctuation():
    assert parse_object_name("Central canal'").base == "Central canal"
    assert parse_object_name("Anterior occipital sulcus*").base == "Anterior occipital sulcus"
def test_slugify():
    assert slugify("Atlas (C1)") == "atlas_c1"
    assert slugify("Anterior meniscotibial ligament (Lateral meniscus)") == "anterior_meniscotibial_ligament_lateral_meniscus"
    assert slugify("Zygomatico-orbital  artery") == "zygomatico_orbital_artery"
    assert slugify("Posterior lateral nasal branches of sphenopalatine artery.") == "posterior_lateral_nasal_branches_of_sphenopalatine_artery"
def test_slug_is_loader_safe():
    import re
    for s in ["Atlas (C1)", "Fourth rib", "M3 segment / x", "a__b", "_x_"]:
        assert re.fullmatch(r"[a-z0-9]+(_[a-z0-9]+)*", slugify(s))
def test_node_name():
    assert node_name("palatine_bone", "l") == "palatine_bone__l"
    assert node_name("heart", None) == "heart"
```

```python
# test_ta2.py: fixture z prawdziwym formatem: BOM, cała linia w cudzysłowie, ';'
def test_load_ta2(tmp_path):
    p = tmp_path / "TA2.csv"
    p.write_text('﻿"TA2ID;English;Latin;Français"\n"2;Vertical;Verticalis;Vertical"\n"9;Vertical;Inny;X"\n', encoding="utf-8")
    assert load_ta2(p) == {"vertical": "Verticalis"}
def test_exclusions(tmp_path):
    p = tmp_path / "ex.txt"; p.write_text("# NC\n^cochlea\n\n^kidney$\n")
    pats = load_exclusions(p)
    assert is_excluded("Cochlea", pats) and is_excluded("Kidney", pats) and not is_excluded("Kidney stone", pats)
```

- [ ] **Step 3: Uruchom `.venv/bin/pytest pipeline/tests -q`: FAIL (brak modułów).**

- [ ] **Step 4: Zaimplementuj `names.py`, `ta2.py`.** Regexy dopasowania są bez rozróżniania wielkości liter. `exclusions.txt` na razie zawiera nagłówek z cytatem licencji z `License.txt`. Wzorce uzupełnia Task 2 na podstawie inwentarza.

- [ ] **Step 5: `.venv/bin/pytest pipeline/tests -q`: PASS.**

- [ ] **Step 6: Commit** `feat(pipeline): parsowanie nazw Z-Anatomy, slug, TA2`

---

### Task 2: Eksport warstw z Blendera i kompresja

**Files:**
- Create: `pipeline/fetch_source.sh`, `pipeline/export_systems.py`, `pipeline/compress.sh`; modify `pipeline/exclusions.txt`
- Output (commit): `public/models/*.glb`

**Interfaces:**
- Consumes: `parse_object_name`, `slugify`, `node_name`, `load_exclusions`, `is_excluded` (Task 1).
- Produces:
  - `public/models/<system>.glb`: płaska lista węzłów-siatek w world space, nazwa węzła = `node_name(id, side)`, `extras = {"name": base, "tissue": <nazwa materiału Z-Anatomy małymi literami albo "">}`, materiał bez tekstur.
  - `build/raw/<system>.names.json`: `[{"id","base","side","system"}]` (wejście dla Task 3).
  - Mapa `COLLECTION_TO_SYSTEM = {"1: Skeletal system":"bones","3: Joints":"joints","4: Muscular system":"muscles","5: Cardiovascular system":"vessels","7: Nervous system & Sense organs":"nerves","8: Visceral systems":"organs"}`.

- [ ] **Step 1: `fetch_source.sh`**: `git clone --filter=blob:none --no-checkout` repo źródła do `build/source/`, `git checkout e3cf19896db825a5c8a9df461e3cd74c96f94ec3 -- Z-Anatomy.zip TA2.csv License.txt`, rozpakuj zip. Idempotentny (pomija, jeśli `Startup.blend` istnieje). Uruchom i sprawdź, że `build/source/Z-Anatomy/Startup.blend` ma 306838281 B.

- [ ] **Step 2: `export_systems.py --inventory`**: tryb, który tylko wypisuje do `build/raw/inventory.tsv` wiersze `system, base, side, type, verts, material, collections`. Uruchom: `.venv/bin/python -I pipeline/export_systems.py build/source/Z-Anatomy/Startup.blend --inventory`. Z inwentarza wybierz obiekty modeli NC (ucho wewnętrzne: ślimak, przedsionek, kanały półkoliste, błędnik itp.; nerka i jej części) i wpisz ich regexy do `exclusions.txt` z komentarzem, skąd pochodzi licencja. Jeśli nie da się jednoznacznie ustalić, które siatki pochodzą z modeli NC, wyklucz całe ucho wewnętrzne i nerki, a w commicie opisz wątpliwość.

- [ ] **Step 3: Eksport.** Dla każdej kolekcji z `COLLECTION_TO_SYSTEM` weź `all_objects` typu `MESH`/`CURVE`, odrzuć `parse_object_name(...) is None`, wykluczenia i siatki < 4 wierzchołków. Krzywe przed konwersją: `resolution_u = 2`, `bevel_resolution = 1`. Siatka = `bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))` (modyfikatory zastosowane) z `transform(obj.matrix_world)`. Każdy obiekt trafia do nowej sceny jako osobny obiekt bez rodzica. Duplikat nazwy węzła w warstwie: scal siatki w jeden obiekt. Eksport `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB', use_active_scene=True, export_extras=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')`. Każdy węzeł dostaje jeden prosty materiał nazwany `tissue`. Uruchom dla wszystkich warstw i zapisz `names.json`.

- [ ] **Step 4: `compress.sh`**: dla każdego pliku `npx gltf-transform optimize build/raw/$s.glb public/models/$s.glb --compress meshopt --join false --instance false --flatten false --texture-compress false --simplify-error 0.0005`. Uprość mocniej (`--simplify-ratio`) tylko warstwy przekraczające budżet z Global Constraints.

- [ ] **Step 5: Weryfikacja.** `ls -l public/models` pokazuje 6 plików w budżecie. Node one-liner z `@gltf-transform/core` (`NodeIO` + `EXTMeshoptCompression` i `MeshoptDecoder` z `meshoptimizer`): liczba węzłów z siatką w każdym `.glb` = liczba wpisów w `names.json` tej warstwy, a każda nazwa pasuje do `^[a-z0-9]+(_[a-z0-9]+)*(__[lr])?$`. Zapisz liczby w opisie commita.

- [ ] **Step 6: Commit** `feat(pipeline): eksport 6 warstw Z-Anatomy do glb (meshopt)` (skrypty + `public/models/*.glb`).

---

### Task 3: Generowanie i scalanie `data/structures.csv`

**Files:**
- Create: `pipeline/build_csv.py`, `data/structures.csv`
- Test: `pipeline/tests/test_build_csv.py`

**Interfaces:**
- Consumes: `build/raw/*.names.json` (Task 2), `load_ta2` (Task 1).
- Produces: `merge_rows(existing: list[dict], found: list[dict], ta2: dict) -> list[dict]`; `read_csv(path) -> list[dict]`, `write_csv(path, rows)`; CLI `python -I pipeline/build_csv.py`.

- [ ] **Step 1: Testy**

```python
def test_new_row_gets_en_la_and_status():
    rows = merge_rows([], [{"id":"palatine_bone","base":"Palatine bone","side":"l","system":"bones"}], {"palatine bone":"Os palatinum"})
    assert rows == [{"id":"palatine_bone","system":"bones","pl":"","en":"Palatine bone","la":"Os palatinum","pl_status":"do_weryfikacji"}]
def test_existing_edits_preserved():
    old = [{"id":"palatine_bone","system":"bones","pl":"Kość podniebienna","en":"Palatine bone","la":"Os palatinum","pl_status":"zweryfikowane"}]
    assert merge_rows(old, [{"id":"palatine_bone","base":"Palatine bone","side":"r","system":"bones"}], {}) == old
def test_missing_ta2_leaves_la_empty():
    assert merge_rows([], [{"id":"x_y","base":"X y","side":None,"system":"nerves"}], {})[0]["la"] == ""
def test_rows_gone_from_model_are_kept():   # ręczna praca nie ginie po zmianie modelu
    old = [{"id":"gone","system":"bones","pl":"A","en":"A","la":"","pl_status":"do_weryfikacji"}]
    assert merge_rows(old, [], {}) == old
def test_same_id_in_two_systems_keeps_first():
    found = [{"id":"a","base":"A","side":None,"system":"bones"},{"id":"a","base":"A","side":None,"system":"joints"}]
    assert [r["system"] for r in merge_rows([], found, {})] == ["bones"]
def test_roundtrip_bom_and_commas(tmp_path):
    rows = [{"id":"a","system":"bones","pl":"Więzadło, przednie","en":"A","la":"","pl_status":"do_weryfikacji"}]
    write_csv(tmp_path/"s.csv", rows)
    assert (tmp_path/"s.csv").read_bytes().startswith(b"\xef\xbb\xbf")
    assert read_csv(tmp_path/"s.csv") == rows
```

- [ ] **Step 2: `pytest`: FAIL.** **Step 3: Implementuj** (sortowanie wynikowe: `system` w kolejności z `COLLECTION_TO_SYSTEM`, potem `en`; `en` = `base` z wielką pierwszą literą). **Step 4: `pytest`: PASS.**

- [ ] **Step 5: Uruchom CLI, wygeneruj `data/structures.csv`.** Wypisz statystyki: liczba wierszy per system i ile ma puste `la`.

- [ ] **Step 6: Commit** `feat(data): structures.csv z nazwami EN i łac. (TA2)`

---

### Task 4: Dane w przeglądarce (`structures.js`)

**Files:**
- Create: `src/structures.js`, `vite.config.js` (`base: './'`, `publicDir: 'public'`); skopiuj `data/structures.csv` do `public/data/structures.csv` przez krok `prebuild`/`predev` w `package.json` (`cp data/structures.csv public/data/`), a `public/data/` dodaj do `.gitignore`
- Test: `tests/structures.test.js`

**Interfaces:**
- Produces:
  - `parseStructures(csvText: string) -> Map<string, Structure>`, gdzie `Structure = {id, system, pl, en, la, plStatus}`. Papaparse z `header: true`, `skipEmptyLines: true`, autodetekcja separatora, usunięcie BOM, trim nagłówków.
  - `resolveMeshName(name: string) -> {id: string, side: 'l'|'r'|null}`.
  - `displayName(s: Structure | null, side, lang: 'pl'|'en'|'la', fallbackEn?: string) -> string`. Puste pole w danym języku → kolejno `en`, `la`, `fallbackEn`. Sufiks strony: pl `" (strona lewa)"`/`" (strona prawa)"`, en `" (left)"`/`" (right)"`, la `" (sin.)"`/`" (dext.)"`.

- [ ] **Step 1: Testy**

```js
const CSV = 'id,system,pl,en,la,pl_status\r\npalatine_bone,bones,Kość podniebienna,Palatine bone,Os palatinum,do_weryfikacji\r\n';
test('parses comma CSV with CRLF', () => expect(parseStructures(CSV).get('palatine_bone').la).toBe('Os palatinum'));
test('parses Excel PL: BOM + semicolons + quoted comma', () => {
  const t = '﻿id;system;pl;en;la;pl_status\n"a_b";joints;"Więzadło, przednie";A;;zweryfikowane\n';
  expect(parseStructures(t).get('a_b')).toEqual({id:'a_b',system:'joints',pl:'Więzadło, przednie',en:'A',la:'',plStatus:'zweryfikowane'});
});
test('resolveMeshName', () => {
  expect(resolveMeshName('palatine_bone__l')).toEqual({id:'palatine_bone',side:'l'});
  expect(resolveMeshName('heart')).toEqual({id:'heart',side:null});
});
test('displayName with side and fallback', () => {
  const s = parseStructures(CSV).get('palatine_bone');
  expect(displayName(s,'l','pl')).toBe('Kość podniebienna (strona lewa)');
  expect(displayName(s,'r','la')).toBe('Os palatinum (dext.)');
  expect(displayName({...s, pl:''},null,'pl')).toBe('Palatine bone');
  expect(displayName(null,null,'pl','Unknown thing')).toBe('Unknown thing');
});
test('every CSV id survives three.js node-name sanitizing', async () => {
  const { PropertyBinding } = await import('three');
  const real = parseStructures(fs.readFileSync('data/structures.csv','utf8'));
  for (const id of real.keys()) expect(PropertyBinding.sanitizeNodeName(id)).toBe(id);
});
```

- [ ] **Step 2: `npx vitest run tests/structures.test.js`: FAIL.** **Step 3: Implementuj.** **Step 4: PASS.** **Step 5: Commit** `feat(web): parsowanie structures.csv i nazwy wyświetlane`

---

### Task 5: Wyszukiwarka (`search.js`)

**Files:** Create `src/search.js`; Test `tests/search.test.js`

**Interfaces:**
- Consumes: `Structure` (Task 4).
- Produces: `normalize(text: string) -> string` (małe litery, NFD bez znaków diakrytycznych, `ł→l`, `æ→ae`, `œ→oe`, `ae→e` i `oe→e` dla łaciny, białe znaki zwinięte); `searchStructures(structures: Iterable<Structure>, query: string, limit = 20) -> Structure[]`.

Ranking: wszystkie słowa zapytania muszą wystąpić w jednym z pól `pl/en/la`. Punktacja: pole zaczyna się od zapytania (3) > słowo zaczyna się od słowa zapytania (2) > zawiera (1). Remis rozstrzyga krótsza nazwa. Zapytanie poniżej 2 znaków → `[]`.

- [ ] **Step 1: Testy**

```js
const S = [
  {id:'gluteus_medius_muscle',system:'muscles',pl:'Mięsień pośladkowy średni',en:'Gluteus medius muscle',la:'Musculus gluteus medius',plStatus:'do_weryfikacji'},
  {id:'gluteus_maximus_muscle',system:'muscles',pl:'Mięsień pośladkowy wielki',en:'Gluteus maximus muscle',la:'Musculus gluteus maximus',plStatus:'do_weryfikacji'},
  {id:'clavicle',system:'bones',pl:'Obojczyk',en:'Clavicle',la:'Clavicula',plStatus:'do_weryfikacji'},
];
test.each(['pośladkowy średni','posladkowy sredni','GLUTEUS MEDIUS','glutaeus medius','medius'])('finds gluteus medius for %s', q =>
  expect(searchStructures(S,q)[0].id).toBe('gluteus_medius_muscle'));
test('multi-word AND', () => expect(searchStructures(S,'pośladkowy wielki').map(s=>s.id)).toEqual(['gluteus_maximus_muscle']));
test('prefix ranks first', () => expect(searchStructures(S,'obo')[0].id).toBe('clavicle'));
test('short query empty', () => expect(searchStructures(S,'o')).toEqual([]));
test('normalize', () => expect(normalize('  Łokieć  ')).toBe('lokiec'));
```

- [ ] **Step 2: FAIL.** **Step 3: Implementuj** (indeks znormalizowanych pól liczony raz, w `WeakMap` po obiekcie). **Step 4: PASS.** **Step 5: Commit** `feat(web): wyszukiwarka PL/EN/łac. odporna na diakrytyki`

---

### Task 6: Menedżer warstw (`layers.js`)

**Files:** Create `src/layers.js`; Test `tests/layers.test.js`

**Interfaces:**
- Produces: `class LayerManager` z `constructor(loadFn: (system) => Promise<THREE.Object3D>, onChange: (system, state) => void)`, gdzie `state = {visible: boolean, status: 'idle'|'loading'|'ready'|'error', error?: string}`. Metody:
  - `setVisible(system, visible) -> Promise<void>`: przy `true` wczytuje (raz; równoległe wywołania dzielą jedną obietnicę). Po wczytaniu ustawia `root.visible` zgodnie z **ostatnim** żądaniem.
  - `ensureLoaded(system) -> Promise<THREE.Object3D>`: wczytuje i włącza warstwę.
  - `getRoot(system) -> THREE.Object3D | null`, `getState(system)`, `retry(system)`.
  - Błąd wczytania → `status: 'error'`, `visible: false`. Kolejne `setVisible(true)` próbuje ponownie.

- [ ] **Step 1: Testy** (fałszywy `loadFn` z ręcznie rozwiązywaną obietnicą, `new THREE.Group()`):
  - `loads once when toggled on twice quickly`: dwa `setVisible('bones', true)` → `loadFn` wołany 1 raz.
  - `on→off during load ends hidden`: `setVisible(true)`, potem `setVisible(false)` przed rozwiązaniem → po rozwiązaniu `getRoot('bones').visible === false`, `getState().visible === false`.
  - `ensureLoaded for search result loads and shows`: `await ensureLoaded('nerves')` → `visible === true`, `status === 'ready'`.
  - `error then retry succeeds`: pierwszy load odrzuca → `status 'error'`; drugi `setVisible(true)` woła `loadFn` ponownie i kończy `ready`.
  - `onChange` dostaje kolejno `loading` i `ready`.

- [ ] **Step 2: FAIL.** **Step 3: Implementuj.** **Step 4: PASS.** **Step 5: Commit** `feat(web): wczytywanie warstw na żądanie`

---

### Task 7: Przeglądarka 3D: scena, kolory, picking, widoczność

**Files:**
- Create: `src/config.js`, `src/pick.js`, `src/visibility.js`, `src/viewer.js`
- Test: `tests/pick.test.js`, `tests/visibility.test.js`

**Interfaces:**
- Consumes: `resolveMeshName` (Task 4), `LayerManager` (Task 6).
- Produces:
  - `config.js`: `SYSTEMS = [{key, file, color, label: {pl, en}}]` w kolejności `bones, joints, muscles, vessels, nerves, organs`. Pliki: `models/<key>.glb`. Kolory: bones `#e8dcc4`, joints `#b9c7cf`, muscles `#b5473f`, vessels `#c0392b` (żyły `#3d5fa8`), nerves `#e2c044`, organs `#c98b78`. `TISSUE_COLORS = {cartilage:'#a9c4cc', ligament:'#d8cdb0', tendon:'#e9e6dc', 'articular capsule':'#cdbfa3'}`. `HIDDEN_TISSUES = ['fascia', 'skin-in']` (ukryte domyślnie, przełącznik „Pokaż powięzie”). `DEFAULT_ON = ['bones']`.
  - `pick.js`: `isTap(down: {x,y,t}, up: {x,y,t}) -> boolean` (przesunięcie ≤ 6 px i czas ≤ 500 ms); `pickWithTolerance(raycastAt: (x,y) => Hit | null, x, y, radius = 12) -> Hit | null` (najpierw środek, potem 8 punktów na okręgu o promieniu `radius`; wygrywa trafienie z najmniejszym `distance`).
  - `visibility.js`: działa na tablicy siatek (`mesh.userData.hiddenByUser`): `hide(meshes, target)`, `isolate(meshes, target)`, `showAll(meshes)`. Izolacja ukrywa wszystkie siatki ze wszystkich wczytanych warstw poza wszystkimi siatkami tej samej struktury (ten sam `id`, obie strony). Warstwy wczytane po izolacji też respektują izolację (`applyTo(newMeshes)`).
  - `viewer.js`: `createViewer(canvas, {onSelect}) -> {loadLayer(system) -> Promise<Object3D>, select(id, side?), clearSelection(), hideSelected(), isolateSelected(), showAll(), setTissueVisible(tissue, bool), frame(object)}`. `loadLayer` używa `GLTFLoader` + `MeshoptDecoder` (`three/examples/jsm/libs/meshopt_decoder.module.js`). Materiały `MeshStandardMaterial` współdzielone per kolor. Zaznaczenie podmienia materiał siatek struktury na wspólny materiał podświetlenia (emisja), a odznaczenie przywraca oryginał. `OrbitControls` z tłumieniem, pan włączony. Klik/tap: `pointerdown`/`pointerup` + `isTap` + `pickWithTolerance` (raycast tylko po widocznych siatkach). `onSelect({id, side, fallbackEn})` albo `onSelect(null)` przy kliknięciu w tło. Pierwsza wczytana warstwa ustawia kamerę na swój bounding box. Tło `#14171c`, światło hemisferyczne + kierunkowe przy kamerze. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, render na żądanie (po zmianie kontrolek/stanu), nie w ciągłej pętli.

- [ ] **Step 1: Testy**

```js
test('tap vs drag', () => {
  expect(isTap({x:0,y:0,t:0},{x:4,y:3,t:200})).toBe(true);
  expect(isTap({x:0,y:0,t:0},{x:30,y:0,t:200})).toBe(false);   // obrót
  expect(isTap({x:0,y:0,t:0},{x:1,y:0,t:900})).toBe(false);    // przytrzymanie
});
test('tolerance finds thin nerve next to finger', () => {
  const hit = {distance: 5, object: 'n'};
  const raycastAt = (x,y) => (x===112 && y===100) ? hit : null;
  expect(pickWithTolerance(raycastAt,100,100)).toBe(hit);
  expect(pickWithTolerance(() => null,100,100)).toBeNull();
});
test('center hit wins without sampling', () => { /* raycastAt liczy wywołania; trafienie w środku → 1 wywołanie */ });
// visibility.test.js: siatki = obiekty {name, visible:true, userData:{}}
test('isolate keeps both sides of structure', /* femur__l, femur__r, tibia__l → isolate(femur__l) → tylko femury widoczne */);
test('isolate applies to later-loaded layer', /* applyTo([muscle]) → muscle.visible false */);
test('showAll restores and clears isolation', ...);
test('hide only target structure side', /* hide(femur__l) → femur__r widoczny */);
```

- [ ] **Step 2: FAIL.** **Step 3: Implementuj `pick.js`, `visibility.js`, `config.js`, potem `viewer.js`.** `viewer.js` nie ma testów jednostkowych (WebGL). Sprawdza go e2e w Task 8. Kolor siatki: `TISSUE_COLORS[extras.tissue]` → dla `vessels`, gdy `extras.name` pasuje do `/\b(vein|venous|sinus|vena)\b/i` → kolor żył → kolor systemu. **Step 4: `npx vitest run`: PASS.** **Step 5: Commit** `feat(web): scena 3D, picking z tolerancją, izolacja`

---

### Task 8: Interfejs, spięcie i test dymny

**Files:**
- Create: `index.html`, `src/ui.js`, `src/main.js`, `src/style.css`, `e2e/smoke.spec.js`, `playwright.config.js` (webServer: `npm run build && npx vite preview --port 4173`)

**Interfaces:**
- Consumes: wszystko z Task 4–7.
- Produces: działająca strona. `main.js`: fetch `data/structures.csv` → `parseStructures`, `LayerManager(viewer.loadLayer, ui.renderLayerState)`, włączenie `DEFAULT_ON`. Atrybuty do e2e: `data-testid` = `layer-<key>`, `search-input`, `search-result`, `info-panel`, `info-main`, `info-pl`, `info-en`, `info-la`, `badge-unverified`, `btn-hide`, `btn-isolate`, `btn-show-all`, `lang-pl`, `lang-en`, `lang-la`, `footer`.

Zachowanie:
- Panel warstw: checkbox per układ z etykietą w języku interfejsu; stan `loading` → spinner przy nazwie, `error` → „Nie udało się wczytać, spróbuj ponownie” (klik = `retry`). Pod warstwami przełącznik „Pokaż powięzie”.
- Panel info po wyborze: nazwa główna (wg `lang`) duża, pod nią trzy wiersze `PL / ENG / ŁAC` (z `displayName`). Znacznik `badge-unverified` „do weryfikacji” przy PL, gdy `plStatus === 'do_weryfikacji'` (tooltip: „Polska nazwa nie została jeszcze sprawdzona”). Przyciski: Ukryj / Pokaż tylko to / Pokaż wszystko. Struktura spoza CSV → nazwa `fallbackEn` + PL/łac. „—”.
- Wyszukiwarka: pole u góry, wyniki na żywo (debounce 120 ms), max 20, każdy wynik: nazwa główna + nazwa w drugim języku + nazwa układu. Wybór → `layers.ensureLoaded(system)` → `viewer.select(id)` → `frame` → panel info. Enter wybiera pierwszy wynik, Esc zamyka listę.
- Przełącznik języka `PL | EN | ŁAC` (domyślnie PL, zapamiętany w `localStorage` w try/catch): zmienia nazwę główną i wyniki. Interfejs jest po angielsku tylko przy `EN`, przy `PL` i `ŁAC` po polsku.
- Mobile (`max-width: 700px`): panel info jako bottom sheet wysuwany od dołu (max 45% wysokości), panel warstw zwinięty pod przyciskiem „Warstwy”. `touch-action: none` na canvasie. Viewport meta z `width=device-width, initial-scale=1`.
- Stopka (`footer`), tekst dokładnie: „Model 3D: Z-Anatomy (Gauthier Kervyn, Marcin Zielinski), CC BY-SA 4.0, na podstawie BodyParts3D © The Database Center for Life Science, CC BY-SA 2.1 Japan; modele nerwów czaszkowych: University of Dundee, CAHID, CC BY 4.0; Brainder i White matter: University of Washington. Nazwy łacińskie i angielskie: Terminologia Anatomica 2 (za Z-Anatomy). Polskie nazwy: robocze, do weryfikacji. Atlas: CC BY-SA 4.0.” Linki do źródła Z-Anatomy i licencji.

- [ ] **Step 1: Test e2e** `e2e/smoke.spec.js` (Chromium, `--trace off`):
  - strona się ładuje, `footer` zawiera „Z-Anatomy” i „CC BY-SA 4.0”, `layer-bones` zaznaczony i po chwili bez spinnera;
  - wpisz `obojczyk` (albo `clavicle`, póki brak PL) w `search-input` → klik pierwszego `search-result` → `info-panel` widoczny, `info-la` zawiera „Clavicula”;
  - `lang-la` → `info-main` zawiera „Clavicula”;
  - `btn-isolate`, potem `btn-show-all`: bez błędów w konsoli (zbieraj `page.on('pageerror')`, oczekuj 0);
  - włącz `layer-muscles` → stan `ready` w ≤ 30 s;
  - viewport 390×844: `info-panel` przy dolnej krawędzi (`boundingBox().y + height ≈ 844`), brak poziomego scrolla (`scrollWidth <= clientWidth`).
- [ ] **Step 2: `npx playwright test --trace off`: FAIL.** **Step 3: Implementuj UI i `main.js`.** **Step 4: `npx playwright test --trace off`: PASS.** Zrób zrzut ekranu (desktop i telefon) i obejrzyj go: kolory, czytelność, panel.
- [ ] **Step 5: Commit** `feat(web): interfejs atlasu, wyszukiwarka, panel nazw, mobile`

---

### Task 9: Polskie nazwy: kości i stawy/więzadła

**Files:** Modify `data/structures.csv` (wiersze `system ∈ {bones, joints}`)

**Interfaces:** Consumes: kolumny `en`, `la` (Task 3). Produces: niepuste `pl` dla wszystkich wierszy tych układów, `pl_status = do_weryfikacji`.

Zasady tłumaczenia (wspólne dla Task 9–11): tłumacz z łaciny (`la`), a gdy pusta, z `en`. Stosuj Polskie Mianownictwo Anatomiczne. Mianownik, pierwsza litera wielka, reszta małymi (poza nazwami własnymi i oznaczeniami typu C1, Th12). Bez strony w nazwie (stronę dodaje UI). Wzorce: „Musculus X” → „Mięsień X”; „Ligamentum” → „Więzadło”; „Articulatio” → „Staw”; „Arteria/Vena/Nervus” → „Tętnica/Żyła/Nerw”; „Os X” → „Kość X”. Utrzymuj spójność: ta sama łacińska część zawsze tak samo po polsku. Nie zgaduj w ciemno: nazwę, której nie da się przetłumaczyć z rozsądną pewnością, zostaw pustą i wypisz w opisie commita.

- [ ] **Step 1: Tłumacz partiami po ~100 wierszy** (skryptem: wyciągnij `id,en,la` do pliku tymczasowego, wpisz `pl`, scal po `id`; nie ruszaj innych kolumn ani wierszy).
- [ ] **Step 2: Weryfikacja:** skrypt node/py liczy puste `pl` w `bones`/`joints` (oczekiwane: 0 albo dokładnie te z listy w commicie), sprawdza, że żadne `pl` nie zawiera „lewa/prawa/left/right”, wszystkie statusy to `do_weryfikacji`, i porównuje liczbę wierszy przed i po (bez zmian). `npx vitest run` PASS.
- [ ] **Step 3: Commit** `data(pl): robocze polskie nazwy kości i stawów (do weryfikacji)`

### Task 10: Polskie nazwy: mięśnie
Jak Task 9, dla `system = muscles` (wraz z kaletkami, pochewkami ścięgnistymi i powięziami). Commit: `data(pl): robocze polskie nazwy mięśni (do weryfikacji)`.

### Task 11: Polskie nazwy: naczynia, nerwy, narządy
Jak Task 9, dla `vessels`, `nerves`, `organs`. Commit: `data(pl): robocze polskie nazwy naczyń, nerwów i narządów (do weryfikacji)`.

---

### Task 12: Spójność danych, CI, publikacja, dokumentacja

**Files:**
- Create: `scripts/check-data.mjs`, `.github/workflows/pages.yml`, `LICENSE` (kod: MIT), `LICENSE-content.md` (model i dane: CC BY-SA 4.0 z pełną listą atrybucji ze stopki i informacją o wykluczonych modelach NC), modify `README.md`, `package.json` (skrypty `test`, `test:e2e`, `check-data`, `build`)

**Interfaces:**
- Consumes: `public/models/*.glb`, `data/structures.csv`, `resolveMeshName`, `parseStructures`.
- Produces: `node scripts/check-data.mjs`: exit 0/1. Sprawdza: każdy węzeł z siatką w każdym `.glb` ma wiersz CSV (`resolveMeshName(name).id`); id w CSV unikalne i zgodne z regexem z Global Constraints; `system` ∈ `SYSTEMS`; `pl_status` ∈ {`do_weryfikacji`, `zweryfikowane`}; każdy `.glb` < 95 MB. Wypisuje ostrzeżenia (bez błędu) dla pustych `pl`/`la` z licznikami per układ.

- [ ] **Step 1: `check-data.mjs`**, uruchom na prawdziwych danych → exit 0. Zepsuj tymczasowo jeden status w kopii CSV (argument `--csv`) → exit 1 z czytelnym komunikatem (wiersz, kolumna).
- [ ] **Step 2: `pages.yml`**: na push do `main` i ręcznie: `actions/checkout`, `setup-node` 22, `npm ci`, `npm test` (vitest), `npm run check-data`, `npm run build`, `actions/upload-pages-artifact` z `dist/`, `actions/deploy-pages`. Osobny job `pytest` z `pip install pytest` (bez bpy, testy pipeline nie importują `bpy`).
- [ ] **Step 3: README**: co to jest i link do strony; jak edytować nazwę (edytuj wiersz w `data/structures.csv` przez GitHuba albo Excel/Sheets, zapisz jako CSV UTF-8, zmień `pl_status` na `zweryfikowane` po sprawdzeniu); jak przebudować model (`pipeline/fetch_source.sh` → `export_systems.py` → `compress.sh` → `build_csv.py`); licencje.
- [ ] **Step 4: Weryfikacja końcowa:** `npm test && npm run check-data && npx playwright test --trace off && .venv/bin/pytest pipeline/tests -q`: wszystko PASS (wklej wynik).
- [ ] **Step 5: Commit + push** na `claude/atlas-anatomii-design-q4yomr`. Włączenie Pages (Settings → Pages → Source: GitHub Actions) i merge do `main` robi Seba albo Claude po jego zgodzie.
