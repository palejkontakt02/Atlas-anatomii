# Atlas ćwiczeń 3D: plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zakładka „Ćwiczenia” w atlasie: przysiad w ruchu na modelu z atlasu, mięśnie kolorowane wg aktywności z badań (% MVIC), panel „Teraz pracują”, kąty na żywo, karta mięśnia ze źródłami; plus osobne kolory brzuśca i ścięgna w całym atlasie.

**Architecture:** Pipeline eksportuje każdy mięsień jako węzeł z kilkoma prymitywami (brzusiec / ścięgno wg slotów materiałów Z-Anatomy). Ćwiczenie to plik JSON (kinematyka, fazy, mięśnie z krzywymi % MVIC, źródła), czytany przez czyste funkcje w `src/exercise/`. Osobny widok 3D (`exercise-view.js`) ładuje kości i mięśnie, zamienia je na `SkinnedMesh` ze szkieletem z `rig.js` (sprawdzonym w próbie 2) i co klatkę ustawia pozę i kolory z danych.

**Tech Stack:** jak atlas: three.js 0.187, Vite, Vitest, Playwright 1.63, Python 3.13 + bpy 5.3.0.

**Spec:** `docs/superpowers/specs/2026-11-24-atlas-cwiczen-design.md` (oraz atlas: `docs/superpowers/specs/2026-11-24-atlas-anatomii-design.md`)

## Global Constraints

- Każda liczba aktywności ma źródło z pliku ćwiczenia; mięsień bez danych liczbowych ma `mvic: null` i `estimate: true`, i nigdzie nie pokazuje procentów.
- Wszystkie dane ćwiczenia mają `status: "do_weryfikacji"`, widoczny w UI.
- Wartości domyślne przysiadu (ze spec): kolano 120°, biodro 115°, stopa 30°, tułów 34°, lędźwie 10°, ramiona w przód do poziomu; cykl: start 0,5 s, zejście 2 s, dół 0,4 s, wstawanie 1,6 s, koniec 0,5 s (razem 5,0 s); tempo 1× / 0,5×.
- Maksimum zgięcia grzbietowego stopy i przodopochylenia miednicy wcześniej niż maksimum kolana i biodra (Zawadka 2020).
- Tryb ćwiczeń ładuje tylko warstwy `bones` i `muscles`; powięzie i otrzewna ukryte.
- Cienie tylko gdy `matchMedia('(pointer: fine)')`; `pixelRatio ≤ 2`.
- Identyfikatory mięśni w JSON = `id` z `data/structures.csv`.
- Język UI jak atlas (PL domyślnie, EN przy `lang=en`), nazwy mięśni przez `displayName`.

## Review Focus

1. **Przełączanie Atlas ↔ Ćwiczenia kilka razy:** modele ładują się raz, brak błędów, a stan (język, zaznaczenie w atlasie) zostaje. Test: e2e w Task 6.
2. **Zatrzymanie i obrót:** po pauzie poza się nie zmienia przy obracaniu, a przeciągnięcie suwaka w trakcie odtwarzania pauzuje. Test: `player` w Task 3.
3. **Mięsień z „szacunkiem”:** karta i lista pokazują rolę i „szacunek”, bez „%”. Test: `activationAt` w Task 3 i e2e w Task 6.
4. **Błędny plik ćwiczenia** (id spoza CSV, źródło bez definicji, czasy nierosnące): `check-data` kończy się błędem, a widok pomija nieznany mięsień zamiast się wywrócić. Testy w Task 3.
5. **Telefon:** szuflada panelu nie zasłania paska odtwarzania i nie ma poziomego scrolla. Test: e2e phone w Task 6.

---

## Struktura plików

```
pipeline/export_systems.py      (zmiana) prymitywy wg slotów materiałów
src/parts.js                    partOf(materialName) → 'belly' | 'tendon' | 'other'
src/viewer.js                   (zmiana) normalizacja dzieci węzła wieloprymitywowego, kolor per część
src/config.js                   (zmiana) colorFor uwzględnia część
data/exercises/przysiad.json    dane ćwiczenia ze źródłami
src/exercise/exercise-data.js   parseExercise, sampleAngles, phaseAt, activationAt, validateExercise
src/exercise/player.js          createPlayer (czas, pauza, tempo, przewijanie)
src/exercise/heat.js            heatColor(mvic), ROLE_COLORS
src/exercise/rig.js             findJoints, buildSkeleton, skinWeights, applyPose
src/exercise/exercise-view.js   createExerciseView(canvas, opts)
src/exercise/exercise-ui.js     pasek, panel „Teraz pracują”, kąty, karta mięśnia
src/main.js, index.html, src/style.css  (zmiana) zakładki Atlas | Ćwiczenia (#cwiczenia)
scripts/validate-data.js        (zmiana) walidacja ćwiczeń
tests/parts.test.js, tests/exercise-data.test.js, tests/player.test.js, tests/heat.test.js, tests/rig.test.js
e2e/exercise.spec.js
```

---

### Task 1: Eksport brzuśca i ścięgna jako osobnych części

**Files:** Modify `pipeline/export_systems.py`; Create `src/parts.js`, `tests/parts.test.js`; regenerate `public/models/*.glb`

**Interfaces:**
- Produces: w `.glb` każdy węzeł struktury ma mesh z 1..n prymitywami; materiał prymitywu nazywa się nazwą materiału Z-Anatomy (małe litery). `extras` węzła bez zmian (`name`, `tissue` = pierwszy slot).
- Produces: `partOf(materialName: string) -> 'tendon' | 'belly' | 'other'` w `src/parts.js`: `tendon` dla `/tendon|aponeuros|ligament|articular capsule|bursa|cartilage/`, `belly` dla nazw funkcyjnych mięśni Z-Anatomy (`abductor, adductor, flexion…, extension…, levator, depressor, …, superficial, biarticular, ingestion, phonation, masticator, trapezius, diaphragm, orbicularis/constrictor, internal rotator, external rotation, origin-*, end-*`) i `muscle`, w pozostałych przypadkach `other`.

- [ ] **Step 1: Test `partOf`:** `tendon`→tendon, `ligament`→tendon, `abductor`→belly, `flexion fingers`→belly, `orbicularis/constrictor`→belly, `internal rotator`→belly, `bone`→other, `''`→other.
- [ ] **Step 2: `npx vitest run tests/parts.test.js`: FAIL.** **Step 3: Implementuj.** **Step 4: PASS.**
- [ ] **Step 5: Eksport.** W `build_mesh` zachowaj `material_index` ścian: dla każdego wpisu mapuj sloty obiektu na wspólną listę nazw materiałów (`slot.material.name.lower()` albo `''`), ustaw indeksy ścian w bmesh na wspólną listę, a do `me.materials` dodaj materiały o tych nazwach (jeden `bpy.data.materials` na nazwę). Usuń przypisanie jednego materiału per obiekt. Uruchom eksport wszystkich warstw i `pipeline/compress.sh`.
- [ ] **Step 6: Weryfikacja:** `npm run check-data` → OK (te same liczby węzłów: 277, 413, 683, 669, 577, 114); `node build/glbinfo.mjs public/models/muscles.glb` pokazuje > 1 materiał; rozmiary warstw w budżecie (≤ 20 MB). Commit `feat(pipeline): brzusiec i ścięgno jako osobne części modelu`.

### Task 2: Atlas rysuje brzusiec i ścięgno osobno

**Files:** Modify `src/viewer.js`, `src/config.js`; Test `tests/config.test.js`

**Interfaces:**
- Consumes: `partOf` (Task 1).
- Produces: po `loadLayer` każdy `Mesh` ma `name` = nazwa węzła struktury, `userData = {name, system, tissue: <materiał prymitywu>, part}`; zaznaczenie, ukrywanie i izolacja działają na wszystkich częściach struktury. `colorFor(system, tissue, name, part?)`: dla `part === 'tendon'` w warstwie `muscles` → `TISSUE_COLORS.tendon`; dla `belly` → kolor mięśni.

- [ ] **Step 1: Testy `colorFor`:** `colorFor('muscles','tendon','Latissimus dorsi','tendon')` = `#e9e6dc`; `colorFor('muscles','tendon','Latissimus dorsi','belly')` = `#b5473f` (materiał prymitywu brzuśca to np. `adductor`, ale test sprawdza, że `part` ma pierwszeństwo).
- [ ] **Step 2: FAIL → Step 3: Implementuj.** W `loadLayer` dla węzła będącego `Group` z wieloma `Mesh`: dzieci dziedziczą `name` i `userData` rodzica, a `tissue` bierze się z `child.material.name`. `HIDDEN_TISSUES` sprawdza `tissue` części. **Step 4: `npx vitest run` + `npx playwright test --trace off`: PASS.** Zrzut ekranu pleców z mięśniami: najszerszy grzbietu czerwony z białym ścięgnem. Commit `feat(web): osobne kolory brzuśca i ścięgna`.

### Task 3: Dane ćwiczenia i czyste funkcje

**Files:** Create `data/exercises/przysiad.json`, `src/exercise/exercise-data.js`, `src/exercise/player.js`; Modify `scripts/validate-data.js`, `scripts/check-data.mjs`, `package.json` (`copy-data` kopiuje też `data/exercises/`); Test `tests/exercise-data.test.js`, `tests/player.test.js`, `tests/check-data.test.js`

**Interfaces:**
- Produces (format JSON):
  ```
  { id, name: {pl, en}, summary: {pl, en}, status, duration: 5.0,
    phases: [{ id, name: {pl,en}, from, to, contraction: 'none'|'eccentric'|'isometric'|'concentric' }],
    angles: { hip|knee|ankle|trunk|lumbar|shoulder|elbow: [[t, deg], ...] },   // t ∈ [0,1], rosnące
    muscles: [{ ids: [structureId...], role: 'main'|'synergist'|'stabilizer'|'antagonist',
                curve: [[t, mvic], ...] | null, range: 'np. 21–63%' | null, estimate: bool, note: {pl,en}, sources: [sourceId] }],
    sources: [{ id, cite, url }] }
  ```
- Produces (JS):
  - `parseExercise(json) -> Exercise` (rzuca `Error` z czytelnym opisem przy błędnym formacie).
  - `sampleAngles(ex, t: 0..1) -> {hip, knee, ankle, trunk, lumbar, shoulder, elbow}` (stopnie, interpolacja smoothstep między punktami).
  - `phaseAt(ex, t) -> Phase`.
  - `activationAt(ex, structureId, t) -> {mvic: number|null, role, contraction, estimate, range, note, sources} | null` (null, gdy mięsień nie bierze udziału).
  - `musclesNow(ex, t) -> [{ids, role, mvic, estimate, contraction}]` posortowane: najpierw z liczbą malejąco, potem szacunki wg roli.
  - `validateExercise(ex, structures: Map) -> string[]` (błędy: id spoza CSV, źródło nieznane, `t` spoza [0,1] lub nierosnące, faza bez pokrycia 0..1).
  - `createPlayer({duration}) -> {time, playing, speed, tick(dtSeconds), play(), pause(), toggle(), seek(t01), setSpeed(0.5|1), progress()}`.

Dane przysiadu (Step 5) wpisuje wykonawca z tabeli w spec; wymagane punkty: kąty 0 w fazie startu i końca, maksimum w dole (wartości z Global Constraints), stopa i lędźwie (miednica) osiągają maksimum przy t = 0,40 zamiast 0,50. Krzywe: VMO 5 → 22 → 45 → 68 (dół) → 65 → 45 → 22 → 5; VL 5 → 21 → 42 → 63 → 60 → 42 → 21 → 5 (Isear 1997); prosty uda 17–21; pośladkowy wielki 6–8 płytko, rosnący do ok. 20 w dole i przy wstawaniu, `range: "6–8% płytko; więcej przy zgięciu kolana > 70°"`; kulszowo-goleniowe 4–12 (do 16); prostownik grzbietu 21–25; piszczelowy przedni, łydka, mięśnie brzucha, przywodziciel wielki, pośladkowy średni: `curve: null, estimate: true`. Każdy mięsień ma `sources`.

- [ ] **Step 1: Testy** (na małym ćwiczeniu testowym w pliku testu):
  - `sampleAngles` w t=0 → same 0; w środku fazy dołu → wartości maksymalne; monotoniczne w fazie zejścia.
  - `phaseAt(ex, 0.3).contraction === 'eccentric'`, w dole `'isometric'`, przy wstawaniu `'concentric'`.
  - `activationAt` dla mięśnia z krzywą zwraca liczbę między punktami; dla szacunku `{mvic: null, estimate: true}`; dla mięśnia spoza ćwiczenia `null`; obie strony (`id` bez sufiksu) działają.
  - `musclesNow` sortuje: liczby malejąco, potem szacunki.
  - `validateExercise` zwraca dokładnie: `'mięsień "nie_ma": brak w structures.csv'`, `'źródło "x" nie jest zdefiniowane'`, `'angles.knee: czasy muszą rosnąć w zakresie 0–1'`.
  - player: `tick(1)` przy duration 5 → progress 0,2; `pause(); tick(1)` nie zmienia czasu; `seek(0.5)` pauzuje i ustawia 2,5 s; `setSpeed(0.5); play(); tick(1)` → +0,5 s; zawijanie po końcu cyklu.
  - check-data: prawdziwy `przysiad.json` przechodzi walidację (test czyta pliki z dysku).
- [ ] **Step 2: FAIL → Step 3: Implementuj funkcje → Step 4: napisz `przysiad.json` → Step 5: `npx vitest run` + `npm run check-data`: PASS.** Commit `feat(exercise): format danych ćwiczenia i dane przysiadu ze źródłami`.

### Task 4: Szkielet i wagi (rig)

**Files:** Create `src/exercise/rig.js`; Test `tests/rig.test.js`

**Interfaces:**
- Produces:
  - `SEGMENTS = ['footl','shankl','thighl','pelvis','thorax','head','uarml','farml','uarmr','farmr','thighr','shankr','footr']`.
  - `findJoints(boneMeshes: Mesh[]) -> {hipl, hipr, kneel, kneer, anklel, ankler, shoulderl, shoulderr, elbowl, elbowr, wristl, wristr, l2, l4, c7, c1}` (Vector3; metody z próby 2: głowa kości udowej, kłykcie, kość skokowa, głowa i koniec kości ramiennej, koniec kości promieniowej, środki kręgów).
  - `buildSkeleton(J) -> {skeleton: THREE.Skeleton, bones: Record<segment, Bone>, root: Bone}` (korzeń = stopa lewa w stawie skokowym; hierarchia z próby 2).
  - `segmentLines(J) -> Record<segment, [Vector3, Vector3]>`.
  - `skinWeights(vertices: Vector3[], ctx: {name, side, isBone, lines, hipY}) -> {indices: Uint16Array, weights: Float32Array}` (4 wpływy na wierzchołek, suma 1). Reguły z próby 2: kości sztywno wg nazw (`RIGID`); mięśnie: waga 1/(d+0,006)^4, top 3; nogi tylko gdy mięsień schodzi poniżej `hipY − 0,06` i |x| < 0,198; ręce tylko dla siatek z |centroid.x| > 0,19 lub nazw z `SHOULDER_CROSSING`.
  - `applyPose(bones, angles)`: ustawia rotacje jak `pose()` z próby 2 (shank = ankle, thigh = −knee, pelvis = hip, thorax = lumbar, head = −0,55·tułów, ramiona = −(shoulder + 0,9·tułów·udział), łokieć = −elbow, prawa noga symetrycznie).

- [ ] **Step 1: Testy na syntetycznych danych** (linie odcinków ręcznie, bez modelu):
  - wierzchołek w połowie uda → waga `thighl` > 0,95;
  - wierzchołek przy kolanie → `thighl` i `shankl` obie > 0,3;
  - siatka „rectus_abdominis_muscle” powyżej bioder → żaden wierzchołek nie ma wagi odcinka nogi;
  - siatka o centroidzie |x| = 0,25 → wierzchołki tylko z odcinków ramienia lub tułowia;
  - kość `femur__l` → 100% `thighl`; `tibia__r` → `shankr`; `vertebra_t5` → `thorax`;
  - `applyPose` z kątami dołu przysiadu: stopa prawa po złożeniu łańcucha leży na wysokości stopy lewej (±1 mm) i równolegle do podłogi.
- [ ] **Step 2: FAIL → Step 3: Przenieś logikę z `spike/squat/main.js` do funkcji powyżej → Step 4: PASS.** Commit `feat(exercise): szkielet i wagi skórowania`.

### Task 5: Widok 3D ćwiczenia

**Files:** Create `src/exercise/heat.js`, `src/exercise/exercise-view.js`; Test `tests/heat.test.js`

**Interfaces:**
- Consumes: Task 1–4, `fetchModel`, `GLTFLoader` + `MeshoptDecoder`, `partOf`.
- Produces:
  - `heatColor(mvic: number) -> string` (hex; 0 → przygaszony mięsień `#5a2f2c`, 35 → `#e8742a`, ≥ 70 → `#ffd23f`; liniowo w przestrzeni HSL między punktami); `ROLE_COLORS = {main:'#ff4a2e', synergist:'#ffae2e', stabilizer:'#4aa3ff', antagonist:'#b07aff'}`; `ESTIMATE_OPACITY = 0.55`.
  - `createExerciseView(canvas, {exercise, onSelect, onFrame}) -> {ready: Promise<void>, play(), pause(), seek(t01), setSpeed(s), setColorMode('activity'|'role'), select(structureId|null), dispose(), cameraState()}`. `onFrame({t, phase, angles, muscles})` wołane co klatkę (do UI). `onSelect({id, side, fallbackEn} | null)`.
  - Kolor co klatkę: części `belly` mięśni z ćwiczenia → `heatColor(mvic)` albo kolor roli; mięśnie szacunkowe w trybie aktywności → kolor roli z `ESTIMATE_OPACITY`; pozostałe mięśnie → przygaszony kolor bazowy; ścięgna, kości jak w atlasie. Zaznaczenie: emisja akcentu `#45e0c2`.
  - Render na żądanie gdy pauza (jak próba 2), cienie tylko przy `pointer: fine`.

- [ ] **Step 1: Testy `heatColor`:** `heatColor(0) === '#5a2f2c'`, `heatColor(70) === '#ffd23f'`, `heatColor(100) === '#ffd23f'`, `heatColor(35)` różny od obu końców.
- [ ] **Step 2: FAIL → Step 3: Implementuj `heat.js` i `exercise-view.js`** (scena, światła i podłoga z próby 2; ładowanie bones + muscles; skinning przez `rig.js`; poza z `sampleAngles(player.progress())`). **Step 4: PASS** + ręczna kontrola: tymczasowa strona `spike/` albo zrzut z Task 6. Commit `feat(exercise): widok 3D ćwiczenia`.

### Task 6: Zakładka „Ćwiczenia”, panel i testy w przeglądarce

**Files:** Create `src/exercise/exercise-ui.js`, `e2e/exercise.spec.js`; Modify `index.html`, `src/main.js`, `src/style.css`, `src/config.js` (teksty UI)

**Interfaces:**
- Consumes: `createExerciseView`, `parseExercise`, `musclesNow`, `activationAt`, `displayName`, `structures` (Map z atlasu).
- Produces: zakładki `data-testid="tab-atlas"` / `tab-exercise` (hash `#cwiczenia`); atlas i ćwiczenia mają osobne canvasy, a widok ćwiczenia tworzy się przy pierwszym wejściu i zostaje (ponowne wejście nie ładuje modeli drugi raz). Testowe `data-testid`: `ex-play`, `ex-seek`, `ex-speed`, `ex-phase`, `ex-angles`, `ex-now` (lista), `ex-now-item`, `ex-colormode`, `ex-card`, `ex-card-role`, `ex-card-mvic`, `ex-card-source`, `ex-status`.

UI:
- Pasek: ▶/⏸, suwak z kolorowymi odcinkami faz pod nim, tempo 1×/0,5×, nazwa fazy z typem skurczu.
- Kąty: „Biodro 112° · Kolano 118° · Staw skokowy 29° · Tułów 33°” (zaokrąglone, `tabular-nums`).
- „Teraz pracują”: z `musclesNow`, maks. 10 pozycji, nazwa w języku interfejsu, pasek % albo „szacunek”, plakietka roli. Klik pozycji = zaznaczenie mięśnia.
- Karta mięśnia (klik w model lub listę): nazwy PL / ENG / ŁAC, rola, typ skurczu teraz, % teraz i zakres z badań albo „szacunek: brak danych liczbowych”, notatka, źródła jako linki.
- Stopka ćwiczenia: „Dane z badań, do weryfikacji. Źródła w karcie mięśnia.”
- Telefon: panel „Teraz pracują” jako szuflada nad paskiem (max 40% wysokości).

- [ ] **Step 1: e2e** `e2e/exercise.spec.js`:
  - `tab-exercise` → `ex-play` widoczny, `ex-phase` po 6 s zawierało kolejno „Zejście” i „Wstawanie” (sprawdzane przez `expect.poll`);
  - `ex-seek` na 0,54 (dół) → `ex-now` pierwszy element zawiera „obszerny” i „%”; `ex-angles` zawiera „Kolano 120°”;
  - klik pozycji „piszczelowy przedni” (szacunek) → `ex-card-mvic` zawiera „szacunek”, nie zawiera „%”;
  - klik pozycji z liczbą → `ex-card-source` zawiera link `doi.org`;
  - przełączenie `tab-atlas` → `tab-exercise` → `tab-atlas` dwa razy bez błędów konsoli, a `window.__atlas.exerciseLoads === 1`;
  - po `ex-play` (pauza) dwa odczyty `cameraState`/kąty w odstępie 500 ms są równe;
  - telefon 390×844: brak poziomego scrolla, `ex-play` nie jest przykryty (elementFromPoint).
- [ ] **Step 2: FAIL → Step 3: Implementuj → Step 4: `npx playwright test --trace off` + `npx vitest run` + `npm run check-data`: PASS.** Zrzuty ekranu (komputer: dół przysiadu ze skosu; telefon), obejrzyj je. Commit `feat(exercise): zakładka Ćwiczenia z panelem i kartą mięśnia`.

### Task 7: Dokumentacja i podgląd

**Files:** Modify `README.md`, `LICENSE-content.md` (źródła danych ćwiczeń: dane liczbowe z cytowanych badań, opis własny)

- [ ] **Step 1:** README: sekcja „Jak dodać ćwiczenie” (format JSON, wymóg źródeł, `npm run check-data`).
- [ ] **Step 2:** Pełna weryfikacja: `npm test && npm run check-data && npx playwright test --trace off && .venv/bin/pytest pipeline/tests -q` → wszystko PASS.
- [ ] **Step 3:** Commit + push; zbuduj podgląd (`VITE_MODEL_FORMAT=b64`, fragment HTML) i opublikuj pod adresem podglądu atlasu.
