# Atlas anatomii 3D: projekt

Data: 2026-11-24 · Autor: Seba (Sebastian Palej) + Claude

## Po co
Darmowy, interaktywny atlas anatomii całego ciała człowieka dla studentów (fizjoterapia i pokrewne kierunki). Ma być dostępny przez zwykły link, bez instalacji i logowania. Wyróżnia go to, że każda struktura ma nazwę w **trzech językach: polskim, angielskim i łacinie**. Istniejące narzędzia są płatne (Complete Anatomy, BioDigital) albo nie mają polskiego (Z-Anatomy). Atlas należy do Seby, a treść będzie poprawiana na bieżąco.

## Cele
- Model 3D całego ciała, który można obracać, przybliżać i przesuwać, także na telefonie.
- Warstwy do włączania i wyłączania: kości, stawy/więzadła, mięśnie, nerwy, naczynia, narządy wewnętrzne.
- Kliknięcie dowolnej struktury podświetla ją i pokazuje nazwę PL / ENG / łac.
- Wyszukiwarka struktur w każdym z trzech języków („pośladkowy średni”, „gluteus medius”).
- Przełącznik języka interfejsu i głównej nazwy (domyślnie polski).
- Ukrywanie i izolowanie pojedynczej struktury („pokaż tylko to”), żeby dało się zajrzeć głębiej.
- Darmowy hosting z publicznym linkiem.

## Poza zakresem v1 (non-goals)
- Opisy struktur (przyczepy, unerwienie, funkcja). Format danych zostawia na nie miejsce, ale v1 ma tylko nazwy.
- Quiz i fiszki.
- Konta, logowanie, panel edycji dla współautorów (to wariant B, do dołożenia później).
- Aplikacja w sklepie (iOS/Android).

## Czego atlas nie może robić (anti-goals)
- Mieć błędnego polskiego nazewnictwa, które student przepisze na kolokwium. Polskie nazwy są oznaczone jako „do weryfikacji”, dopóki ktoś ich nie sprawdzi.
- Wczytywać się minutami albo zawieszać telefonu.
- Łamać licencji modelu (brak podania autorów).
- Kosztować cokolwiek studentów albo Sebę.

## Ograniczenia
- Model źródłowy: **Z-Anatomy** (pochodna BodyParts3D), licencja CC BY-SA 4.0. Wymagane jest podanie autorów w atlasie, a sam atlas (model + dane) udostępniamy na tej samej licencji. Przed startem trzeba potwierdzić aktualną licencję w źródle.
- Pełny model waży setki MB. Trzeba go podzielić na pliki per układ, skompresować (glTF + Draco/Meshopt) i wczytywać dopiero po włączeniu warstwy.
- Hosting: GitHub Pages. Pliki są statyczne, limit pojedynczego pliku to 100 MB, a rozmiar repo powinien rozsądnie zmieścić się w limitach GitHuba.
- Zmiany treści robi Seba albo Claude na jego prośbę, przez commity w repo.

## Rozważone podejścia
- **A. Statyczna strona w repo GitHub + GitHub Pages (WYBRANE).** Przeglądarka 3D i pliki z nazwami w repo, z pełną historią zmian. Jest najtańsza i najprostsza, a cała kontrola zostaje u Seby. Minus: inni edytują przez GitHuba albo przez Sebę.
- **B. A + baza (Supabase) i panel edycji z logowaniem.** Wygodne dla wielu współautorów, ale więcej budowania i kont do pilnowania. Odłożone. Można je dołożyć na A bez przepisywania.
- **C. Osadzenie modelu z Sketchfab.** Szybkie, ale atlas nie byłby własny i nie dałoby się zrobić 3 języków ani wyszukiwarki. Odrzucone.

Seba wybrał A, bo zmiany będzie robił głównie sam, a panel można dodać później.

## Jak to działa (ustalenia)
- **Dane nazw:** jeden plik `data/structures.csv` (do edycji też w Excelu/Sheets) z kolumnami: `id` (identyfikator obiektu w modelu), `system` (układ), `pl`, `en`, `la`, `pl_status` (`do_weryfikacji` / `zweryfikowane`). Strona czyta ten plik, więc zmiana nazwy to edycja jednej linijki.
- **Polskie nazwy:** pierwszą wersję tłumaczy Claude z nazw łacińskich według polskiego mianownictwa anatomicznego. Wszystkie dostają status `do_weryfikacji`, a w atlasie widać przy nich dyskretny znacznik.
- **Model:** skrypt (w repo) konwertuje Z-Anatomy na osobne pliki glTF per układ, z nazwami obiektów jako `id`.

## Decyzje zostawione wykonawcy (moje propozycje, do zmiany)
- Biblioteka 3D: three.js, bez frameworka, żeby wersja była lekka i prosta w utrzymaniu.
- Wygląd: ciemne, spokojne tło, układy w kolorach zbliżonych do atlasów (kości kość słoniowa, mięśnie czerwień, nerwy żółć, naczynia czerwień/niebieski). Na telefonie panel informacji wysuwa się od dołu.
- Kolejność budowy: najpierw kości i mięśnie (najważniejsze dla fizjo), potem nerwy, naczynia i narządy.
- Nazwa repo: `atlas-anatomii`, publiczne (wymagane przez darmowe GitHub Pages).
- Stopka z podaniem autorów modelu i licencji.

## Co jest potrzebne od Seby
- Założyć repo `atlas-anatomii` na swoim koncie GitHub (albo dać znać, jeśli chce inną nazwę) i podać Claude'owi nazwę konta, żeby mógł je podpiąć.
- Docelowo: weryfikacja polskich nazw, sam albo z osobami z roku.
