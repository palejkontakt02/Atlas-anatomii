# Licencja modelu i danych

Model 3D (`public/models/*.glb`) i dane z nazwami (`data/structures.csv`) są udostępnione na licencji
[Creative Commons Uznanie autorstwa – Na tych samych warunkach 4.0 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.pl).

## Źródła i autorzy

- **Z-Anatomy – The libre 3D atlas of anatomy**, Gauthier Kervyn (projekt, 3D, anatomia) i Marcin Zielinski (skrypty),
  CC BY-SA 4.0. Źródło: <https://github.com/Z-Anatomy/Models-of-human-anatomy>, commit `e3cf19896db825a5c8a9df461e3cd74c96f94ec3`.
- **BodyParts3D**, © The Database Center for Life Science, CC BY-SA 2.1 Japan.
  <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>
- **Cranial Nerves and Foramina**, University of Dundee, CAHID, CC BY 4.0 (w ramach Z-Anatomy).
- **Brainder** i **White matter**, University of Washington (w ramach Z-Anatomy).
- Nazwy łacińskie i angielskie: **Terminologia Anatomica 2**, w wersji z pliku `TA2.csv` projektu Z-Anatomy.
- Polskie nazwy: robocze tłumaczenie przygotowane dla atlasu, oznaczone `do_weryfikacji`, dopóki ktoś ich nie sprawdzi.

## Zmiany względem źródła

Model został podzielony na warstwy (kości, stawy i więzadła, mięśnie, naczynia, układ nerwowy i narządy zmysłów,
narządy wewnętrzne), spłaszczony, uproszczony i skompresowany (Meshopt). Usunięto obiekty pomocnicze etykiet.

## Wykluczone modele

`License.txt` Z-Anatomy wymienia dwa modele na licencjach niekomercyjnych, niezgodnych z CC BY-SA 4.0.
Atlas ich nie zawiera (lista wzorców w `pipeline/exclusions.txt`):

- „Anatomy of the Inner Ear”, University of Dundee School of Medicine, CC BY-NC-SA 4.0 (ślimak, przedsionek);
- „Kidney”, Lissie Cowley, CC BY-NC 4.0 (nerka, miedniczka nerkowa, naczynia wewnątrznerkowe).

## Dane ćwiczeń

Dane w `data/exercises/` (kąty w stawach, aktywność mięśni w % MVIC) pochodzą z badań cytowanych w polu `sources` każdego pliku, m.in. Isear i in. 1997 (https://doi.org/10.1097/00005768-199704000-00016), Zawadka i in. 2020, Endo i in. 2020 (https://doi.org/10.1589/jpts.32.391). Liczby są przytoczone jako fakty z publikacji; opisy, role i układ danych są opracowaniem własnym atlasu (CC BY-SA 4.0), oznaczonym `do_weryfikacji`.
