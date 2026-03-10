# PRD — Fleet Status Manager

**Radni naziv:** Sistem za upravljanje voznim parkom, vozačima i dokumentacijom

---

## 1. Cilj proizvoda

Web aplikacija koja firmama omogućava na jednom mestu da vode evidenciju o:

- vozilima i njihovoj dokumentaciji
- vozačima i njihovim dokumentima
- putnim/radnim nalozima
- servisima i održavanju
- potrošnji goriva i kilometraži
- troškovima i zaduženjima po vozačima
- alarmima i podsetnicima za kritične rokove

**Glavni cilj:** sprečiti propuštanje važnih rokova, poboljšati kontrolu troškova i omogućiti pregledno upravljanje voznim parkom.

---

## 2. Problem koji rešavamo

Evidencija se često vodi ručno (Excel, papir, nepovezani sistemi), što dovodi do:

- propuštanja isteka registracije, osiguranja i dozvola
- neorganizovanog praćenja servisa i kvarova
- slabe kontrole potrošnje goriva i kilometraže
- nejasne evidencije zaduženja po vozačima
- otežanog kreiranja i praćenja putnih naloga
- nedostatka centralizovanih alarma i notifikacija

Aplikacija sve ovo objedinjuje u jednom sistemu sa jasnim statusima i automatskim upozorenjima.

---

## 3. Ciljna grupa

**Primarni:** mala i srednja preduzeća sa voznim parkom, transportne i rent-a-car firme, terenske službe, firme sa službenim vozilima.

**Sekundarni:** administratori voznog parka, HR/administracija, menadžeri operacija, računovodstvo, vlasnici.

---

## 4. Scope proizvoda

### 4.1 MVP (Faza 1)

U prvoj verziji obuhvaćeno je:

1. **Autentikacija i uloge** — login, role-based pristup (Super Admin, Admin voznog parka, Operater/Dispečer, Vozač, Menadžment/Viewer).
2. **Evidencija vozila** — CRUD, dokumentacija, statusi, arhiviranje.
3. **Evidencija registracije i dokumentacije** — datumi isteka, automatski statusi (zeleno/narandžasto/crveno/tamnocrveno).
4. **Evidencija vozača** — CRUD, dokumenti, datumi isteka vozačke i lične karte.
5. **Potrošnja goriva i kilometraža** — unos sipanja, praćenje km, prosečna potrošnja, troškovi po vozilu/periodu.
6. **Zaduženja po vozačima** — dodela vozila, opreme i dokumentacije; pregled aktivnih i istorija.
7. **Putni / radni nalozi** — kreiranje, povezivanje sa vozačem i vozilom, kilometraža, troškovi, statusi, PDF.
8. **Servisi i održavanje** — evidencija servisa, troškovi, alarmi za sledeći servis (datum/km).
9. **Alarmi i notifikacije** — automatski alarmi za sve tipove rokova; prikaz u aplikaciji, dashboard; **email notifikacije** (MVP).
10. **GPS priprema** — čuvanje GPS identifikatora po vozilu i API endpoint za buduće prijem podataka (bez live mape i telemetrije).
11. **Dashboard i izveštaji** — KPI kartice, alarmi, troškovi; izveštaji sa filtrima i export (CSV/Excel, osnovni PDF).

**Napomena:** Multi-tenancy (više firmi / organizacija) nije u MVP-u ako nije eksplicitno traženo; aplikacija se može graditi za jednu organizaciju sa mogućnošću kasnijeg dodavanja `organization_id` i izolacije.

### 4.2 Van scope-a za MVP

- Puna GPS telemetrija i live prikaz lokacije
- Mobilna aplikacija
- OCR skeniranje dokumenata
- Integracija sa državnim sistemima
- Automatsko povlačenje podataka od osiguravajućih kuća
- Finansijska/knjigovodstvena integracija
- AI predikcija kvarova
- SMS / push / WhatsApp / Viber notifikacije (planirano u Fazi 2)

### 4.3 Faze nakon MVP

- **Faza 2:** SMS i drugi kanali notifikacija, napredna GPS integracija, napredni izveštaji, mobilni responsive workflow za vozače.
- **Faza 3:** Mobilna aplikacija, automatski uvoz podataka, napredna analitika, AI predikcija.

---

## 5. Moduli i funkcionalni zahtevi

### 5.1 Evidencija vozila

**Svrha:** Unos, pregled i upravljanje podacima o vozilima.

**Polja vozila:**

| Grupa | Polja |
|-------|--------|
| Identifikacija | jedinstveni ID, registarska oznaka, broj šasije |
| Osnovno | marka, model, godište, tip goriva, kubikaža, snaga motora |
| Registracija | datum prve registracije |
| Status | status (aktivno, neaktivno, u servisu, prodato), datum nabavke |
| Vrednost | nabavna cena, trenutna procenjena vrednost, način nabavke (kupovina / lizing) |
| Lizing (opciono) | lizing kompanija, broj ugovora, datum početka/završetka, mesečna rata |
| Ostalo | napomene |

**Dokumentacija vozila:** Za svako vozilo sistem vodi evidenciju dokumenata prema **modulu 5.2** (registracija, osiguranje, zeleni/žuti karton, atest za plin, ostali dokumenti). Svaki dokument ima tip, datume važenja/isteka i status (izračunat automatski).

**Funkcije:** kreiranje/izmena vozila, arhiviranje, pregled istorije promena, upload dokumenata, pregled statusa dokumentacije, prikaz aktivnih alarma za vozilo.

---

### 5.2 Evidencija registracije i dokumentacije

**Svrha:** Jedinstvena evidencija svih rokova vezanih za dokumentaciju vozila (i po potrebi sličnih entiteta).

**Model:** Jedan konceptualni „dokument” po stavci (npr. jedna registracija, jedna polisa, jedan zeleni karton). Za svaki dokument čuvaju se:

- vozilo (ili drugi entitet)
- tip dokumenta (registracija, saobraćajna dozvola, osiguranje, zeleni karton, žuti karton, atest za plin, drugi)
- broj dokumenta (gde ima smisla)
- datum početka važenja
- datum isteka
- status (samo za čitanje, izračunat na osnovu dana do isteka)
- prilog (fajl) — opciono

**Logika statusa:** Na osnovu broja dana do isteka:

- **Zeleno** — važeći, rok nije blizu
- **Narandžasto** — ističe uskoro (npr. 30 dana — prag podesiv)
- **Crveno** — ističe vrlo brzo (npr. 5 dana — prag podesiv)
- **Tamnocrveno** — istekao, nije obnovljen

Pragovi (u danima) podešavaju se u admin panelu i važe globalno za sve dokumente tog tipa.

---

### 5.3 Potrošnja goriva i kilometraža

**Svrha:** Unos i praćenje potrošnje goriva i kilometraže po vozilu.

**Polja unosa (npr. po „sipanju”):**

- vozilo, datum unosa
- stanje kilometraže (trenutno), pređena km od prethodnog unosa
- količina sipanog goriva (L), cena po litru, ukupan iznos
- mesto sipanja / pumpa, tip goriva, napomena

**Funkcije:** ručni unos sipanja, praćenje kilometraže kroz vreme, izračun prosečne potrošnje, upozorenje na nelogične unose (npr. manja km od prethodne), troškovi goriva po vozilu i po periodu.

**Business pravilo:** Završna kilometraža (npr. u putnom nalogu ili u sledećem unosu) ne sme biti manja od početne.

---

### 5.4 Evidencija vozača

**Svrha:** Čuvanje podataka o vozačima i njihovim dokumentima.

**Polja vozača:**

- ID, ime i prezime, JMBG ili interni ID
- kontakt: broj telefona, email, adresa
- zaposlenje: radno mesto, datum zaposlenja, status zaposlenja
- vozačka: broj, kategorije, datum isteka
- lična karta: broj, datum isteka
- napomena

**Funkcije:** CRUD vozača, deaktivacija, upload dokumenata, praćenje isteka vozačke i lične karte, pregled vozila i zaduženja po vozaču, alarmi za dokumentaciju.

**Business pravilo:** Nije dozvoljeno dodeliti vozilo vozaču sa isteklom vozačkom dozvolom, osim ako admin eksplicitno odobri (override).

---

### 5.5 Zaduženja po vozačima

**Svrha:** Praćenje šta je zaduženo kod kog vozača (vozilo, oprema, dokumentacija).

**Tipovi zaduženja:** vozilo, ključevi, kartica za gorivo, GPS uređaj, dokumentacija vozila, službeni telefon, dodatna oprema.

**Polja zaduženja:**

- vozač, tip zaduženja
- povezano vozilo (ako je tip „vozilo” ili povezan sa vozilom)
- datum preuzimanja, datum razduživanja (null = aktivno)
- status (aktivno / razduženo)
- napomena

**Funkcije:** dodela i razduženje, pregled aktivnih zaduženja, istorija, povezivanje sa putnim nalozima i vozilima.

**Odlučeno za MVP:** Jedan vozač može u isto vreme imati više zaduženja (npr. više vozila ili vozilo + oprema). Jedno vozilo može biti zaduženo kod jednog vozača u datom trenutku (1 vozilo : 1 vozač za aktivno zaduženje vozila); za opremu — N:M po tipu.

---

### 5.6 Putni i radni nalozi

**Svrha:** Prikupljanje informacija i kreiranje putnih/radnih naloga.

**Polja naloga:**

- broj naloga, datum kreiranja, status (draft, odobren, završen, otkazan)
- vozač, vozilo
- relacija, svrha puta
- datum i vreme polaska / povratka
- početna i završna kilometraža, broj pređenih km
- potrošnja goriva, troškovi puta, napomene

**Funkcije:** kreiranje i izmena naloga, automatsko povezivanje sa vozačem i vozilom, generisanje PDF-a, pregled i filtriranje po vozaču, vozilu, periodu.

**Business pravilo:** Nije moguće kreirati putni nalog za neaktivno vozilo.

**Odlučeno za MVP:** Putne naloge kreira isključivo dispečer/admin; vozač ih samo pregleda i može uneti osnovne podatke sa terena (npr. završna km) ako to dozvoli uloga.

---

### 5.7 Servisi i održavanje

**Svrha:** Evidencija redovnih i vanrednih servisa.

**Polja:**

- vozilo, tip servisa (redovan, vanredan, preventivni)
- datum upućivanja, datum završetka
- opis radova, servis/radionica
- iznos računa, broj računa
- sledeći preporučeni servis: po kilometraži i/ili po datumu
- prilog (račun/dokumentacija), napomena

**Funkcije:** unos servisa, istorija intervencija, ukupni troškovi održavanja, alarm za sledeći servis (po datumu ili km).

---

### 5.8 Alarmi i notifikacije

**Svrha:** Centralno praćenje ključnih rokova i događaja sa automatskim statusima i notifikacijama.

**Tipovi alarma (MVP):**

- istek registracije, osiguranja, zelenog/žutog kartona, atesta za plin
- istek vozačke dozvole, lične karte
- vreme za preventivni servis; prekoračena km za servis
- neaktivno/nekompletno zaduženje; nelogičan unos kilometraže
- vozilo bez dodeljenog aktivnog vozača (ako je to pravilo u upotrebi)

**Nivoi:** Narandžasti (npr. 30 dana), Crveni (npr. 5 dana), Tamnocrveni (prošao datum). Pragovi podesivi u admin panelu.

**Kanali u MVP:** prikaz u aplikaciji, dashboard upozorenja, **email notifikacije**. SMS i drugi kanali u Fazi 2.

**Pravila:** pragovi podesivi; svaki alarm ima status (aktivan, rešen, ignorisan); audit log — ko je reagovao i kada.

**Implementacija:** Scheduler/cron jednom dnevno (ili po potrebi) proverava datume i kilometražu i generiše/ ažurira alarme. Kada se unese validan novi podatak (npr. nova registracija), odgovarajući alarm se automatski zatvara.

---

### 5.9 GPS priprema (MVP)

**U MVP-u:** čuvanje GPS identifikatora (npr. ID uređaja ili eksternog sistema) po vozilu; API endpoint za prijem podataka (za buduću integraciju). Bez live prikaza, istorije kretanja, geofencinga.

---

### 5.10 Dashboard i izveštaji

**Dashboard (MVP):**

- broj vozila, broj aktivnih vozača
- vozila/vozači sa dokumentacijom pred istek
- vozila koja uskoro idu na servis
- broj aktivnih alarma po nivou
- troškovi servisa i goriva u periodu
- najskuplja vozila za održavanje
- otvoreni putni nalozi

**Izveštaji (MVP):** po vozilu, po vozaču, servisi, registracije/dokumenti, potrošnja goriva, putni nalozi, zaduženja. Filteri po datumu; export CSV/Excel; osnovni PDF.

---

## 6. Korisničke uloge

| Uloga | Opis |
|------|------|
| **Super Admin** | Podešavanja sistema, svi podaci, korisnici i uloge, pragovi alarma. |
| **Administrator voznog parka** | Dodavanje/izmena vozila, servisi, dokumenti, alarmi, dodela vozila, izveštaji. |
| **Operater / Dispečer** | Kreiranje putnih naloga, unos kilometraže i goriva, pregled statusa. |
| **Vozač** | Pregled svojih zaduženja, dodeljenih vozila i putnih naloga; mogućnost unosa osnovnih podataka sa terena (npr. završna km) ako dozvoli konfiguracija. |
| **Menadžment / Viewer** | Samo čitanje: dashboard i izveštaji. |

---

## 7. Ključni korisnički tokovi

1. **Dodavanje vozila:** Admin otvara formu → unosi podatke i dokumentaciju/datume isteka → sistem aktivira praćenje alarma → vozilo je dostupno za zaduženje i naloge.
2. **Dodavanje vozača:** Admin unosi podatke i dokumente → sistem aktivira alarme za vozačku i ličnu kartu.
3. **Servis:** Operater/admin prijavljuje servis (datum, radovi, račun, trošak) → sistem čuva istoriju i po potrebi kreira alarm za sledeći servis.
4. **Alarm za istek registracije:** Scheduler proverava datume → 30 dana pre = narandžasti, 5 dana = crveni, posle isteka = tamnocrveni → kada se unese nova registracija, alarm se zatvara.
5. **Putni nalog:** Dispečer bira vozača i vozilo → unosi relaciju, svrhu, vreme, početnu km → po završetku unosi završnu km i troškove → sistem ažurira statistiku.

---

## 8. Funkcionalni zahtevi (kratko)

- Login i role-based pristup
- Svi podaci u centralnoj bazi; CRUD za vozila, vozače, servise, naloge, dokumente, gorivo, zaduženja
- Automatsko generisanje alarma po datumima i kilometraži
- Upload dokumenata; istorija promena; pretraga i filtriranje
- Dashboard; eksport (CSV/Excel, osnovni PDF)
- Validacija unosa; audit trail za kritične izmene; statusi u boji; responsive UI; priprema za buduće API integracije

---

## 9. Nefunkcionalni zahtevi

- Web aplikacija; prilagođena desktop i tablet uređajima
- Podrška za najmanje 10.000 vozila (indeksi, paginacija, filtriranje)
- Odziv osnovnih akcija ispod 2 sekunde
- Autentikacija i autorizacija; sigurno skladištenje dokumenata
- Backup strategija (npr. Supabase backup + export kritičnih podataka)
- Alarmi: automatski scheduler/cron; API spreman za buduće integracije

---

## 10. Tehnička arhitektura (smernica)

- **Frontend:** Next.js, TypeScript, Tailwind CSS, React Query, shadcn/ui (ili sličan)
- **Backend:** Node.js + NestJS ili Next.js API routes, TypeScript, REST API
- **Baza:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Auth:** NextAuth ili JWT
- **Storage:** S3-kompatibilan storage za dokumenta (npr. Supabase Storage)
- **Background:** Cron/scheduler za alarme; queue za email notifikacije

---

## 11. Struktura baze (pregled)

Glavne tabele:

- `users`, `roles`
- `employees_drivers`, `driver_documents`
- `vehicles`, `vehicle_documents` (ili unifikovana `documents` sa tipom i `entity_type`/`entity_id`)
- `registrations` / `insurance_policies` — po potrebi kao specijalizacija ili polja u dokumentima
- `leasing_contracts`
- `fuel_entries` (sa poljima za kilometražu i gorivo)
- `driver_assignments` (tip zaduženja, vehicle_id opciono)
- `service_records`, `service_invoices` (ili jedinstvena `service_records` sa prilogom)
- `travel_orders`, `travel_order_expenses`
- `alerts`, `alert_rules`
- `gps_devices` (identifikator po vozilu)
- `audit_logs`

Model dokumenata: ili jedna tabela `vehicle_documents` sa `document_type` i datumima isteka, ili više tabela (registrations, insurance_policies) — uskladiti sa odlukom u 5.2.

---

## 12. Ključna business pravila (rezime)

- Jedno vozilo: više dokumenata, više servisnih zapisa.
- Jedan vozač: više zaduženja kroz vreme; u istom trenutku može imati više zaduženja (npr. više vozila ili vozilo + oprema). Aktivno zaduženje za konkretno vozilo: jedno vozilo → jedan vozač.
- Alarmi se generišu automatski; zatvaraju se kada se unese validan novi podatak.
- Završna kilometraža ne sme biti manja od početne.
- Putni nalog nije dozvoljen za neaktivno vozilo.
- Dodela vozila vozaču sa isteklom vozačkom dozvolom nije dozvoljena bez admin override-a.

---

## 13. KPI metrike uspeha

- Broj evidentiranih vozila i vozača
- Procenat dokumenata obnovljenih pre isteka; broj propuštenih registracija/dozvola
- Broj alarma rešenih na vreme
- Smanjenje administrativnih grešaka; vreme za pronalazak podataka o vozilu/vozaču
- Mesečni troškovi goriva i servisa po vozilu

---

## 14. Odluke i otvorena pitanja

**Odluke ugrađene u ovaj PRD:**

- **Potrošnja goriva i kilometraža** — uključena u MVP.
- **Email notifikacije** — uključene u MVP; SMS i ostali kanali u Fazi 2.
- **GPS u MVP** — samo identifikator po vozilu + API za prijem; bez live mape.
- **Putni nalozi** — kreira ih dispečer/admin; vozač pregleda i može unositi terenske podatke ako dozvoli uloga.
- **Zaduženja** — jedan vozač može imati više zaduženja; jedno vozilo u jednom trenutku zaduženo kod jednog vozača.
- **Dokumentacija** — jedan konceptualni model: dokument sa tipom i datumima isteka (sekcija 5.2); implementacija u bazi može biti jedna tabela sa `document_type` ili više tabela po tipu.

**Otvoreno za potvrdu pre razvoja:**

1. **Jedna firma vs SaaS:** Aplikacija za jednu organizaciju ili multi-tenant od starta? (Ako multi-tenant, uvesti `organization_id` i izolaciju u svim tabelama i API-ju.)
2. **Obavezan prilog dokumenata:** Da li svaki dokument (npr. registracija) mora imati upload fajla ili može samo unos datuma?
3. **Cena vozila:** Samo nabavna, samo tržišna, ili obe (dva polja)?
4. **Leasing/osiguranje:** Jednostavan zapis (jedan red po ugovoru) ili posebne tabele za rate/stavke?

Kada se ova pitanja potvrde, treba ih upisati u ovu sekciju kao „Odlučeno” i ažurirati model baze u sekciji 11.
