# Atlas ćwiczeń 3D: projekt

Data: 2026-11-24 · Autor: Seba (Sebastian Palej) + Claude · Status: do akceptacji

## Po co
Druga część atlasu anatomii: interaktywny atlas ćwiczeń dla studentów fizjoterapii. Student widzi ćwiczenie w ruchu na tym samym modelu co w atlasie i widzi, **które mięśnie pracują, jak mocno i w jakim typie skurczu** w każdej fazie ruchu. Model można zatrzymać w dowolnym momencie i obrócić o 360°. Na start jest jedno ćwiczenie, przysiad bez obciążenia, ale format ma pozwolić dodawać kolejne bez programowania.

Czego student ma się z tego nauczyć, czego nie daje obrazek w podręczniku:
- jak zmienia się praca mięśni w czasie (zejście, dół, wstawanie) i z głębokością;
- że role mięśni wynikają z badań, a nie z intuicji (np. w przysiadzie bez obciążenia pośladkowy wielki pracuje słabo, a czworogłowy mocno);
- kolejność ruchu w stawach (staw skokowy i miednica osiągają maksimum wcześniej niż kolano i biodro).

## Cele
- Płynna animacja z przyciskiem ▶/⏸, suwakiem przewijania i tempem 1× / 0,5×; obrót, przybliżanie i przesuwanie w każdej chwili, także na telefonie.
- Mięśnie kolorowane według aktualnej aktywności (% MVIC) z danych z badań; drugi tryb: kolor według roli.
- Panel „Teraz pracują”: lista mięśni z paskiem aktywności, rolą i typem skurczu w bieżącej chwili ruchu.
- Odczyt kątów w stawach na żywo (biodro, kolano, staw skokowy, pochylenie tułowia).
- Kliknięcie mięśnia pokazuje nazwę PL / ENG / ŁAC (jak w atlasie) oraz jego udział w ćwiczeniu: rola, typ skurczu w każdej fazie, zakres aktywności z badań i źródło.
- Każde ćwiczenie to jeden plik danych; nowe ćwiczenie to nowy plik.
- Każda liczba ma źródło; wszystko jest oznaczone „do weryfikacji”, dopóki ktoś nie sprawdzi.

## Poza zakresem (na razie)
- Inne ćwiczenia niż przysiad (format je przewiduje, dane dojdą później).
- Obciążenie zewnętrzne (sztanga), warianty techniki, błędy techniki.
- Siły w stawach, momenty sił, środek ciężkości.
- Opisy przyczepów i unerwienia (to nadal poza zakresem całego atlasu w v1).

## Czego nie może robić (anti-goals)
- Pokazywać aktywności mięśni bez źródła albo podawać liczb, których w źródłach nie ma. Tam, gdzie badań brak, mięsień ma tylko rolę jakościową z oznaczeniem „szacunek”, bez procentów.
- Wyglądać groteskowo: rozrywające się mięśnie, przenikanie rąk przez uda, mięśnie „ciągnące się” za inną częścią ciała.
- Zawieszać telefonu.
- Łamać licencji (ten sam model co atlas, CC BY-SA 4.0; źródła naukowe cytowane z DOI).

## Dane z badań (zebrane 2026-11-24, źródło wyszukiwania: PubMed i strony wydawców)

### Kinematyka przysiadu bez obciążenia
| Wielkość | Wartość w dole przysiadu | Źródło |
|---|---|---|
| Zgięcie kolana | ok. 100–125° (głęboki: 125°) | Endo i in. 2020; PMC8439674; PMC11307177 (zakres ruchu 107°) |
| Zgięcie biodra | ok. 110–125° | Endo i in. 2020; PMC8439674 |
| Zgięcie grzbietowe stopy | ok. 25–33° | Endo i in. 2020; PMC8439674; PMC11307177 |
| Pochylenie tułowia do przodu | ok. 33–35° | Endo i in. 2020; PMC11307177 |
| Kolejność | maksimum zgięcia grzbietowego stopy i przodopochylenia miednicy przychodzi wcześniej niż maksimum kolana, biodra i kręgosłupa; wszystkie stawy ruszają niemal razem | Zawadka i in. 2020 (Lublin); PMC11307177 |

Wartości domyślne w atlasie: kolano 120°, biodro 115°, stopa 30°, tułów 34°, lędźwie 10° zgięcia, ramiona w przód do poziomu. Tempo jak w badaniu EMG Isear 1997: zejście, zatrzymanie i wstawanie po ok. 1,2 s; w atlasie zejście 2 s, dół 0,4 s, wstawanie 1,6 s (wolniej, do nauki), z możliwością 0,5×.

### Aktywność mięśni (EMG, % MVIC) w przysiadzie bez obciążenia
| Mięsień | Aktywność | Jak się zmienia | Źródło |
|---|---|---|---|
| Obszerny przyśrodkowy (VMO) | 22–68% | rośnie z głębokością, najwyższa w dole i na początku wstawania | Isear i in. 1997 |
| Obszerny boczny | 21–63% | jw. | Isear i in. 1997 |
| Prosty uda | 17–21% | maleje lekko przy większym pochyleniu tułowia | PMC5276771 |
| Pośladkowy wielki | 6–8% (płytko); rośnie przy zgięciu kolana > 70° | wyraźniej przy wstawaniu i w głębokim przysiadzie | PMC5276771; Agarwal i in. 2021; przegląd Macadam i Feser 2019 (średnio 33% w ćwiczeniach „pionowych”, zależnie od wariantu) |
| Kulszowo-goleniowe (dwugłowy, półścięgnisty) | 4–12% (do ok. 16% przy 60–90°) | niska, współskurcz stabilizujący kolano | Isear i in. 1997; PMC4316497 |
| Prostownik grzbietu | 21–25% | rośnie z pochyleniem tułowia; ruch zaczyna się od jego rozluźnienia | PMC5276771; Agarwal i in. 2021 |
| Piszczelowy przedni | brak wartości liczbowych dla przysiadu bez obciążenia | aktywny na początku zejścia (sterowanie zgięciem grzbietowym) | Agarwal i in. 2021 (jakościowo) → „szacunek” |
| Brzuchaty łydki, płaszczkowaty | brak pewnych wartości dla przysiadu bez obciążenia | rośnie przy zgięciu kolana > 70° | Agarwal i in. 2021 (jakościowo) → „szacunek” |
| Mięśnie brzucha | brak wartości dla przysiadu bez obciążenia | stabilizacja tułowia | przegląd PMC7345922 (dla wariantów z obciążeniem) → „szacunek” |

Wniosek do pokazania studentom: w przysiadzie bez obciążenia głównym motorem jest **czworogłowy uda**; pośladkowy wielki, kulszowo-goleniowe i łydka pracują pomocniczo i rosną z głębokością; prostownik grzbietu i brzuch stabilizują tułów.

Źródła (PubMed / wydawcy):
- Isear JA, Erickson JC, Worrell TW. EMG analysis of lower extremity muscle recruitment patterns during an unloaded squat. Med Sci Sports Exerc 1997. https://doi.org/10.1097/00005768-199704000-00016
- Zawadka M i in. How Are Squat Timing and Kinematics in The Sagittal Plane Related to Squat Depth? J Sports Sci Med 2020. https://pubmed.ncbi.nlm.nih.gov/32874102/
- Endo Y, Miura M, Sakamoto M. The relationship between the deep squat movement and the hip, knee and ankle range of motion and muscle strength. J Phys Ther Sci 2020. https://doi.org/10.1589/jpts.32.391
- Relationship among the COM Motion, the Lower Extremity and the Trunk during the Squat. https://pmc.ncbi.nlm.nih.gov/articles/PMC11307177
- Hip Flexion Angles During Supine Range of Motion and Bodyweight Squats. Int J Exerc Sci 2021. https://pmc.ncbi.nlm.nih.gov/articles/PMC8439674
- Activation of back and lower limb muscles during squat exercises with different trunk flexion. J Phys Ther Sci 2016. https://pmc.ncbi.nlm.nih.gov/articles/PMC5276771
- EMG Analysis of Lower Extremity Muscles in Three Different Squat Exercises. https://pmc.ncbi.nlm.nih.gov/articles/PMC4316497
- Macadam P, Feser EH. Examination of gluteus maximus EMG excitation… during body weight exercise: a systematic review. Int J Sports Phys Ther 2019. https://pubmed.ncbi.nlm.nih.gov/30746289/
- Agarwal, van Deursen, Mullerpatan. Electromyographic activity during bodyweight deep squat. Trends in Sport Sciences 2021. https://tss.awf.poznan.pl/pdf-132004-110416?filename=Electromyographic.pdf
- Slater LV, Hart JM. Muscle Activation Patterns During Different Squat Techniques. J Strength Cond Res 2017. https://pubmed.ncbi.nlm.nih.gov/26808843/
- Core Muscle Activity during Physical Fitness Exercises: A Systematic Review. https://pmc.ncbi.nlm.nih.gov/articles/PMC7345922

Zastrzeżenia: wartości % MVIC różnią się między badaniami zależnie od metody normalizacji i techniki przysiadu; atlas pokazuje zakres i źródło, a nie jedną „prawdziwą” liczbę.

## Rozważone podejścia (ruch modelu)
- **A. Animacja modelu z atlasu z automatycznym szkieletem (WYBRANE przez Sebę).** Kości sztywno w odcinkach, mięśnie płynnie między odcinkami. Spójne z atlasem, te same nazwy i klikanie. Próba 1 i 2 (2026-11-24) potwierdziły, że wygląda dobrze po poprawkach wag.
- B. Szkielet w ruchu i mięśnie jako „linie działania”. Prostsze, ale bez realnego kształtu mięśni. Odrzucone.
- C. Osobna uproszczona postać. Najgładszy ruch, ale niespójna z atlasem i z dodatkową licencją. Odrzucone.

## Jak to działa (ustalenia)
- **Plik ćwiczenia** `data/exercises/przysiad.json`:
  - nazwa PL / ENG, opis jednym zdaniem, czas cyklu, fazy (nazwa, początek, koniec, typ skurczu mięśni pracujących: ekscentryczny / izometryczny / koncentryczny);
  - kinematyka: kąty stawów w punktach kluczowych cyklu (0–1), z interpolacją; uwzględnia wcześniejsze maksimum stopy i miednicy;
  - mięśnie: identyfikatory struktur z `structures.csv`, rola (główny / pomocniczy / stabilizujący / antagonista), krzywa aktywności (% MVIC w punktach cyklu) albo tylko rola z flagą „szacunek”, zakres z badań, odnośniki do źródeł;
  - lista źródeł (autorzy, rok, tytuł, DOI lub link);
  - `status`: `do_weryfikacji` / `zweryfikowane`.
- **Kolor:** domyślnie mapa ciepła aktywności (0% wygaszony mięsień, ~70% intensywna czerwień), drugi tryb: kolor roli. Mięśnie bez liczb w trybie aktywności dostają kolor roli z kreskowaniem / przygaszeniem, żeby było widać, że to szacunek.
- **Ekran:** zakładka „Ćwiczenia” obok atlasu, ten sam widok 3D. Pasek odtwarzania z fazami na osi czasu, panel „Teraz pracują”, odczyt kątów, legenda. Na telefonie panel jako wysuwana szuflada.
- **Warstwy w trybie ćwiczeń:** tylko kości i mięśnie (bez powięzi i otrzewnej); pozostałe warstwy atlasu są wtedy niedostępne, bo nie mają szkieletu.
- **Model w ruchu:** szkielet 13 odcinków (stopy, podudzia, uda, miednica, tułów, głowa, ramiona, przedramiona), stawy wyznaczane z kości modelu, wagi mięśni z odległości do odcinków z regułami z próby 2 (mięśnie brzucha nie idą za udem, mięśnie przedramienia tylko za ręką, tułów za ramieniem tylko przy przyczepie na kości ramiennej).
- **Poprawka eksportu (dotyczy też atlasu):** brzusiec i ścięgno mięśnia jako osobne części z własnym kolorem (dziś każdy mięsień ma jeden materiał, przez co np. najszerszy grzbietu wygląda jak ścięgno).

## Decyzje zostawione wykonawcy
- Dokładny kształt krzywych aktywności między punktami z badań (interpolacja gładka).
- Paleta mapy ciepła (czytelna w obu kierunkach, odróżnialna od kości i ścięgien).
- Budżet wydajności: obciążenie jak w atlasie (kości + mięśnie ≈ 12,5 MB), cienie tylko na komputerze.
- Usunięcie drobnych artefaktów z próby 2 (pływający punkt, fałdy krtani).

## Co jest potrzebne od Seby
- Akceptacja tego projektu.
- Docelowo: weryfikacja ról i zakresów aktywności, najlepiej z prowadzącym kinezjologię.
