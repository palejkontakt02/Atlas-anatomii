# Atlas anatomii 3D

Darmowy, interaktywny atlas anatomii całego ciała dla studentów fizjoterapii i kierunków pokrewnych.
Każda struktura ma nazwę po **polsku, angielsku i łacinie**. Działa w przeglądarce, także na telefonie, bez instalacji i logowania.

Strona: `https://palejkontakt02.github.io/Atlas-anatomii/` (po włączeniu GitHub Pages, patrz niżej).

## Jak poprawić nazwę

Wszystkie nazwy są w jednym pliku: [`data/structures.csv`](data/structures.csv).

| kolumna | znaczenie |
|---|---|
| `id` | identyfikator struktury w modelu, **nie zmieniać** |
| `system` | warstwa: `bones`, `joints`, `muscles`, `vessels`, `nerves`, `organs` |
| `pl`, `en`, `la` | nazwa po polsku, angielsku, łacinie (bez strony; „lewa/prawa” dodaje atlas) |
| `pl_status` | `do_weryfikacji` albo `zweryfikowane` |

1. Otwórz plik na GitHubie (ikonka ołówka) albo w Excelu / Arkuszach Google.
2. Popraw nazwę. Po sprawdzeniu polskiej nazwy zmień `pl_status` na `zweryfikowane` (znika znacznik „do weryfikacji”).
3. Z Excela zapisz jako **CSV UTF-8**. Średniki zamiast przecinków też zadziałają.
4. Zatwierdź zmianę (commit). Strona zaktualizuje się sama po kilku minutach.

Polskie nazwy są robocze. Łacina pochodzi z `TA2.csv` projektu Z-Anatomy i miejscami ma literówki, więc też wymaga sprawdzenia.

## Atlas ćwiczeń

Zakładka **Ćwiczenia** (adres `#cwiczenia`) pokazuje ćwiczenie w ruchu na modelu z atlasu. Mięśnie świecą według aktywności z badań (% MVIC) albo według roli (główny, pomocniczy, stabilizujący, antagonista). Panel „Teraz pracują” pokazuje listę mięśni w danej chwili ruchu, a karta mięśnia: rolę, typ skurczu, zakres z badań i źródła.

### Jak dodać ćwiczenie

Każde ćwiczenie to jeden plik w [`data/exercises/`](data/exercises/), np. `przysiad.json`:

- `phases`: fazy pokrywające cały cykl `0–1` (`from`, `to`, `contraction`: `none` / `eccentric` / `isometric` / `concentric`);
- `angles`: kąty w stawach w stopniach w punktach cyklu (`hip`, `knee`, `ankle`, `trunk`, `lumbar`, `shoulder` = uniesienie ramion, `elbow`), czasy rosnące;
- `muscles`: dla każdego mięśnia lub grupy `ids` (identyfikatory z `data/structures.csv`), `role`, `curve` (punkty `[t, %MVIC]`) albo `curve: null` i `estimate: true`, gdy brak danych liczbowych, `range`, `note`, `sources`;
- `sources`: każde źródło z `cite` i `url` (najlepiej DOI). **Bez źródła nie wpisujemy liczb.**

Po zmianie uruchom `npm run check-data`: sprawdza identyfikatory mięśni, źródła i kolejność czasów. Na razie zakładka czyta `przysiad.json`.

## Uruchomienie lokalnie

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # testy jednostkowe
npm run test:e2e     # testy w przeglądarce (Playwright)
npm run check-data   # spójność modelu i structures.csv
```

## Przebudowa modelu (rzadko)

Wymaga Pythona 3.13. Pliki źródłowe (ok. 400 MB) trafiają do `build/` i nie są w repo.

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt
pipeline/fetch_source.sh                                                    # pobiera Z-Anatomy
.venv/bin/python -I pipeline/export_systems.py build/source/Z-Anatomy/Startup.blend
pipeline/compress.sh                                                        # → public/models/*.glb
python3 -I pipeline/build_csv.py                                            # dopisuje nowe struktury, nie rusza istniejących
npm run check-data
```

## Publikacja (GitHub Pages)

Workflow `.github/workflows/pages.yml` testuje i publikuje stronę po każdym pushu do `main`.
Jednorazowo: *Settings → Pages → Source: GitHub Actions*.

## Licencje

- Kod: MIT ([LICENSE](LICENSE)).
- Model 3D i dane: CC BY-SA 4.0, autorzy i źródła w [LICENSE-content.md](LICENSE-content.md).
