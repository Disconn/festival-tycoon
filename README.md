# Festival Tycoon

Spielbare technische Basis für ein isometrisches Aufbau- und Wirtschaftsspiel mit Node.js, TypeScript und Three.js.

## Start

Unten links werden die Spielversion aus `package.json` und die beim Build erzeugte
UTC-Buildkennung angezeigt. Die Kennung bleibt im ausgelieferten JavaScript fest,
damit auch ältere geladene Clients eindeutig erkennbar sind. Im Entwicklungsmodus
wird sie beim Start des Dev-Servers erzeugt.

Bei künftigen Änderungen die Projektversion erhöhen (für Fehlerkorrekturen:
`npm version patch --no-git-tag-version`). Dabei werden `package.json` und
`package-lock.json` gemeinsam aktualisiert. Jeder Build erhält zusätzlich automatisch
eine neue Zeitkennung.

```bash
npm install
npm run dev
```

Produktions-Build:

```bash
npm run build
npm run preview
```

## Docker und öffentliche Builds

GitHub Actions baut bei jedem Push auf `master` das Spiel und stellt es öffentlich bereit:

- **Release:** https://github.com/y1zz1y/festival-tycoon/releases/latest (`festival-tycoon-web.zip`)
- **Actions-Artefakt:** Workflow-Lauf *Build* → `festival-tycoon-web`
- **Container:** `ghcr.io/y1zz1y/festival-tycoon:latest`

Lokal spielen (HTTP auf Port 8080, inkl. Mehrspieler). Spielstände liegen im Docker-Volume `festival-saves` und bleiben nach Image-Updates erhalten:

```bash
docker pull ghcr.io/y1zz1y/festival-tycoon:latest
docker run --rm -p 8080:8080 -v festival-saves:/app/saves ghcr.io/y1zz1y/festival-tycoon:latest
```

Oder aus dem Repo: `docker compose up --build`. Danach http://localhost:8080 öffnen.

## Umgebungen und Gelände

Unter **Szenario** stehen Ackerland, Wüste, Grasfläche und Stadtfläche zur Wahl.
Die Beschreibung zeigt die jeweiligen Bodeneigenschaften. Ackerland hat weichen,
regenempfindlichen Boden mit Lehmstellen; Wüste lockeren, langsam zu begehenden Sand
mit geringer Nässebindung. Grasfläche bietet Wiesenboden und einzelne Kiesstellen.
Stadtfläche ist bereits befestigt, entwässert und tragfähig für große Gebäude.
Geländefarben und natürliche Vegetation passen zur Umgebung.

**Geländeunebenheit** reicht von 0 % (vollständig flach) bis 100 % (stark hügelig).
Wüste erzeugt Dünen ohne zufällige Wasserlöcher; Stadtfläche bleibt ebenfalls über
Wasserniveau. Eingang und Straßenzufahrt bleiben bei jedem Wert eingeebnet.
Die Einstellungen gelten beim Start eines neuen Spiels. Spielstände und Multiplayer
übernehmen die Auswahl; vorhandenes Gelände wird beim Laden nicht neu erzeugt.

## Performance, Darstellung und Mehrspieler

### Waren, Müll und Boden vorbereiten

Die **Logistikansicht** in der oberen Leiste blendet Besucher aus. Alle normalen
Bauwerkzeuge bleiben links verfügbar; der ergänzende Logistikplaner sitzt rechts
über der Zeitsteuerung. Beim Umschalten bleibt das gewählte Bauwerkzeug erhalten.
Geöffnete Infofenster nutzen vorübergehend den rechten Platz des Planers. Die Zeit läuft weiter; die Pause-Taste ermöglicht ruhiges Planen.
Bodenarbeiten lassen sich mit gedrückter linker Maustaste als Rechteck aufziehen;
die Vorschau zeigt Kosten und geeignete Felder. Erst beim Loslassen wird gebaut.
Bereits vorbereitete, ungeeignete oder nicht finanzierbare Felder werden übersprungen.
Bodenmarkierungen und Straßenfarben erscheinen nur in der Logistikansicht;
die normale Darstellung bleibt frei von diesen Planungsebenen.

1. Ein freies Feld neben einer Zufahrt und einem Fußweg vorbereiten: Lehm zuerst
   entwässern, dann verdichten. Ein Depot kostet 400 € und belegt ein Feld.
2. Straße vom nördlichen Kartenrand bis direkt neben das Depot führen. Fußwege
   müssen ebenfalls direkt neben Depot und Zielgebäude liegen, auf gleicher Höhe.
3. Ware bestellen oder je Depot Mindestbestände setzen. Automatische Bestellungen
   bezahlen Ware und jeweils 45 € Fracht; Mindestbestand 0 schaltet sie aus.
4. Einen Träger pro Versorgungsroute einstellen (120 €, danach 0,04 €/Spielminute).
   Er trägt bis zu 40 Einheiten. Optionale Wegpunkte müssen auf vorhandenen
   Fußwegen liegen. Essen geht zum Imbiss, Getränke zur Bar, Wasser zum WC.
   Jeder Stand verkauft ausschließlich seinen eigenen angelieferten Vorrat.
5. Müllrouten leeren Eimer ab ihrer Abholschwelle (maximal 12) und bringen die
   Ladung zu einer erreichbaren Müllablage. Eine Ablage fasst 40 Einheiten;
   die vorhandenen Müllwagen übernehmen den weiteren Abtransport.

Bestellungen benötigen zunächst 90 Spielminuten bis zum Kartenrand. Danach fährt
ein sichtbarer Lastwagen zum Depot, entlädt dort und verlässt das Gelände wieder.
Fehlende Straßen, Gegenverkehr und Besucher können ihn aufhalten. Bei Gegenverkehr
helfen Ausweichspuren; Fahrzeuge können vorhandene freie Alternativen nutzen.
Träger behalten ihre Ladung, wenn ein Weg abgerissen oder eine Ablage voll ist.
Unterbrochene Trägerwege lassen sich durch Wiederherstellen der Verbindung reparieren.
Laufende Transporte, Ladungen und Bestände werden gespeichert und vom Host synchronisiert.

Feld-, Lehm- und Kiesboden unterscheiden sich in Tragfähigkeit und Nässeempfindlichkeit.
Entwässerung reduziert Nässewirkung; Verdichten ermöglicht Depots und Bühnen.
Schotter setzt tragfähigen Boden voraus, Pflaster zusätzlich Entwässerung.
Feldstraßen erlauben effektiv höchstens Tempo 10, Schotter 30, Pflaster 50.
Auf aufgeweichten Feldstraßen können Fahrzeuge acht Spielminuten feststecken,
während der Fahrer sie freischiebt. Sonne trocknet den Boden wieder.
Große Fahrgeschäfte und große Bandauftritte benötigen ein gepflastertes Fundament.
Versorgungsgebäude arbeiten auf solchem Untergrund mit 125 % Geschwindigkeit;
auf weichem, nassem Boden langsamer. Bestehende Gebäude werden nicht entfernt.

Volle Wege bremsen Besucher bis auf langsames Durchschieben ab, ohne sie vollständig zu blockieren. Unterwegs prüfen Besucher ihre Route regelmäßig erneut und nutzen auch neu gebaute Verbindungen. Die tatsächliche Belegung im Verhältnis zur Wegkapazität erhöht die Routenkosten stark: freie Nachbarwege und Umwege werden dadurch bevorzugt. Ändert sich das Gedränge, werden zwischengespeicherte Routen verworfen. Pro Spielschritt werden höchstens vier Routen geprüft; bei großen Menschenmengen erfolgt die Prüfung zeitlich verteilt. Handkarren schieben sich langsamer als Besucher durch Gedränge und belegen beladen drei, leer zwei Personenplätze. Besucher auf anderen Höhen blockieren sie nicht. Routenkosten werden alle zehn festen Spielschritte aktualisiert, während die Belegung für die Bewegung aktuell bleibt.
Gedränge und schlechte Oberflächen bremsen Bewegung; die Wegsuche berücksichtigt
Oberflächenqualität und Gedränge. Breite Wege und verteilte Anziehungspunkte helfen.
Die neuen Bestandsregeln gelten auch im freien Spiel. Alte gemeinsame Vorräte
werden beim ersten Depotbau als ausstehende Lieferungen übernommen, nicht direkt
auf Stände verteilt. Wasser wird mit dem Trinkwasser-Ausbau an versorgten WCs
im Umkreis von drei Feldern ausgegeben.

### Auswählbare Wegtypen

Die Icon-Leiste direkt über dem **Weg-Werkzeug** und im **Weg-Editor** bietet in beiden
Ansichten vier Fußwege
(Trampelpfad, Schotterweg, Holzbohlenweg, Promenade) und vier Straßen
(Feldstraße, Schotterstraße, Fahrplatten, Asphalt) in der Baukategorie **Logistik**. Ein Klick auf ein Material-Icon ändert direkt den Baumodus; Gold markiert die aktuelle Auswahl.
Tooltips beschreiben Preis pro Feld und Anforderungen. Dezente Materialtexturen zeigen Holzbohlen,
Pflasterfugen, Schotter und Fahrplatten ohne zusätzliche Planungsmarkierungen.
Mit dem normalen Weg- beziehungsweise Straßenwerkzeug werden Flächen auf Geländehöhe gebaut oder bestehende
Beläge ersetzt. Der Weg-Editor übernimmt denselben Fußwegbelag für seine Segmente, einschließlich Warteschlangen.

Holzbohlen und Fahrplatten funktionieren auf weichem Boden. Schotter braucht
tragfähigen Untergrund; Promenade und Asphalt zusätzlich Entwässerung.
Bodenarbeiten und Rodung kosten extra. Ein Belagwechsel kostet den vollen neuen
Belag; gleiche Beläge werden kostenlos übersprungen. Die Bodenverbesserungen
bleiben getrennt von den Eigenschaften der Verkehrsflächen bestehen.
Die dezente Materialfarbe ist auch im normalen Spiel sichtbar, ohne neue Overlays.

### Simulation und Darstellung

Die Simulation bewegt Besucher in festen 100-ms-Schritten. Die Darstellung interpoliert
zwischen diesen Zuständen. Bildrate und Bildschirmauflösung beeinflussen dadurch nicht
mehr die Bewegungsberechnung. Die Wegsuche verwendet einen wiederverwendeten Graphen,
einen Routencache und eine mengenabhängig begrenzte Entscheidungswarteschlange. Änderungen
an der Welt und neue Gedrängedaten machen die jeweils betroffenen Caches ungültig.

Im Mehrspieler berechnet ausschließlich der Host die Simulation. Clients schicken
Befehle einschließlich ihrer Bauhöhe und Drehung und erhalten alle 200 ms Änderungen
am Weltzustand. Besucher werden feldweise aktualisiert; unveränderte Weltbereiche werden
nicht erneut übertragen. Beim Beitritt oder erneuten Abgleich wird ein vollständiger
Zustand übertragen. WebSocket-Kompression und eine Sendepuffergrenze am Host reduzieren
Übertragungsaufwand und Rückstau. Alle Teilnehmer müssen dieselbe Spielversion verwenden.
Der Host muss geöffnet bleiben; eine automatische Host-Übernahme ist nicht enthalten.

Die 3D-Ansicht nutzt eine auf maximal 1440 × 810 Bildpunkte begrenzte Pixelrasterung
(auch bei Full HD und 4K), helleres Tageslicht und weiterhin die
isometrische Kamera. Die Oberfläche verwendet kompakte, gerahmte Tycoon-Fenster,
eine zweizeilige Aktionsleiste und getrennte Bau- und Overlay-Bereiche.
Infofenstern weicht die Overlay-Steuerung seitlich aus; in schmalen Ansichten und bei
großen Verwaltungsfenstern wird sie bis zum Schließen des Fensters ausgeblendet.
Aktivierte Karten-Overlays bleiben dabei bestehen.

Prüfungen und reproduzierbarer synthetischer Lasttest:

```bash
npm test
npm run build
```

Die Tests prüfen Wegschlüssel einschließlich `0`, bildratenunabhängige Simulation bei
allen Tempostufen, Welt-Deltas mit Ankunft und Abreise, Pause/Fortsetzen, Baukontext und
echte WebSocket-Verbindungen mit zwei Clients einschließlich spätem Beitritt. Der
Lasttest verwendet 500 und 2.000 Besucher auf einem einfachen Wegenetz und gibt
Simulationszeiten sowie unkomprimierte Nachrichtengrößen aus. Er misst keine GPU-FPS
und ersetzt keinen Dauertest auf einem großen ausgebauten Festival über ein echtes Netzwerk.

## Enthalten

### Festivalwochenende

Über **„Festival planen“** in der oberen Leiste lässt sich auf dem aktuellen Gelände
ein Festivalwochenende starten. Verfügbares Budget und bestehende Gebäude bleiben erhalten.
Der Rest des aktuellen Tages dient der Vorbereitung; darauf folgen zwei Festivaltage.
Nach deren Ende pausiert das Spiel mit einer Auswertung. Ziele sind 150 Anreisen,
65 % durchschnittliche Zufriedenheit an den Festivaltagen und eine nichtnegative
Gesamtbilanz einschließlich Vorbereitung. Anschließend kann eine weitere Ausgabe oder
das freie Spiel folgen.

- **Bands & Spielplan:** Acht fiktive Bands mit Gagen, Zielgruppen, Nachfragewirkung,
  Rufvoraussetzungen und Lautsprecheranforderungen. Jede Bühne benötigt Strom und einen
  erreichbaren Bühnenvorplatz. Zeiten von 08 bis 24 Uhr, 60/90/120 Minuten Auftritt und
  30 Minuten Umbauzeit; Stornierung vor Beginn erstattet die halbe Gage. Parallel laufende
  Bands derselben Zielgruppe erzeugen einen sichtbaren Publikumskonflikt und Unzufriedenheit.
- **Publikum:** Musikfans, Partygänger, Familien, Komfortgäste und Campingfans unterscheiden
  sich in Budget, Vorlieben und Verhalten. Das erwartete Publikum reagiert auf Programm
  und Festivalruf; die tatsächliche Zielgruppe ist in der Besucherinformation sichtbar.
  Konzertbesucher reservieren weiterhin höchstens neun Plätze pro Vorplatzfeld.
- **Wetter:** Heiter, Regen, Hitze und starker Wind mit einer Sechs-Stunden-Risikovorhersage.
  Einzelne Stunden können milder ausfallen. Regen hinterlässt langsam trocknenden Boden
  und verlangsamt unbefestigte Strecken. Hitze kostet Energie; Wind unterbricht ungesicherte
  Auftritte. Der Wetterzustand ist sichtbar und wird deterministisch gespeichert.
- **Vorsorge:** Festivalweite Ausbauten für Wegmatten/Entwässerung, Überdachung (250 Gäste),
  Sturmsicherung, Trinkwasserausgabe und Schallschutz am Ruhecamp. Nahe Nachtkonzerte stören
  ohne Schallschutz die Erholung im Zelt. Die Ausbauten bleiben über Ausgaben hinweg bestehen.
- **Versorgung:** Zentrale Vorräte für Essen, Getränke und Wasser; echte Verkäufe verbrauchen
  Bestände. Bei Ausverkauf erfolgen weder Zahlung noch Warenausgabe. Das gemeinsame Lager
  fasst 3.000, mit Ausbau 5.000 Einheiten inklusive ausstehender Bestellungen. Lieferungen
  kosten Ware plus 45 €, starten sofort oder nach 6/12 Stunden und benötigen 90 freie
  Fahrminuten. Verkehr verzögert sie; ohne Straße am nördlichen Rand bleiben sie aus.
  Lieferungen und Schutzmaßnahmen sind in dieser Version zentral verwaltete Systeme,
  keine zusätzlichen frei platzierbaren 3D-Gebäude oder neuen Lieferwagenmodelle.
- **Abrechnung & Ruf:** Tagesbilanz, Anreisen, Zufriedenheit, Konzertbesuch, Ausverkäufe
  und Wetterbelastung. Vier bleibende Rufwerte für Musik, Atmosphäre, Komfort und Organisation
  beeinflussen zukünftige Nachfrage; Musikruf erschließt größere Bands.

Der Modus ist standardmäßig ausgeschaltet, auch beim Laden älterer Spielstände.
Alle neuen Zustände werden gespeichert und über den Host mit Multiplayer-Clients
synchronisiert. `npm test` prüft zusätzlich den vollständigen Wochenendablauf,
Buchungsregeln, Schutzmaßnahmen, Lager, Lieferungen, Konzertkapazitäten und Rufübernahme.

### Freier Aufbau und bestehende Systeme

- isometrische, dreh- und zoombare 3D-Welt mit 48 × 48 Feldern
- platzierbare Wege, Imbisse, Toiletten und ein Fahrgeschäft
- Wege von einem beliebigen Feld aus als ein Feld breite, zusammenhängende Linie ziehen
- Ziehvorschau vor dem gemeinsamen Bau beim Loslassen
- automatisch erzeugte Rampen und Stützen zwischen den Ebenen
- feste Bauhöhen und vertikale Kollisionsvolumen für alle Objekttypen
- Wege und Gebäude übereinander bauen, sofern ihre Höhenvolumen frei bleiben
- freie Platzierung auch ohne Verbindung zum bestehenden Wegnetz
- Fortsetzungseditor mit festem Startpunkt, Richtung, Steigung und Vorschau
- schrittweises Bauen und Rückgängig-Funktion für die aktuelle Wegkonstruktion
- drehbare Gebäude mit sichtbarer, funktionaler Zugangsrichtung
- Baukosten, stündlicher Unterhalt und einfache Einnahmen
- Gästezahl, Attraktivität und Reputation
- pausierbare Simulation mit drei Geschwindigkeiten
- Bauvorschau, Belegungsprüfung, Abriss- und Info-Werkzeug
- Parkeingang und autonom erscheinende Besucher
- Wegfindung über zusammenhängende Wege
- Besucherbedürfnisse für Sättigung, Toilette, Spaß und Energie
- zielgerichtete Nutzung passender Einrichtungen und Attraktionen
- anklickbare Besucher mit Gedanken, Status und Bedürfnisanzeige
- Alkoholstände mit konfigurierbaren Preisen und echten Besucherzahlungen
- individueller Alkoholpegel sowie ruhige oder aggressive Reaktion auf Trunkenheit
- torkelnde Besucher, erhöhter Energieverlust und Einschlafen bei starker Erschöpfung
- ausweisbare Zeltbereiche mit persönlichen Besucherparzellen
- Anreise mit Bollerwagen, Zeltaufbau, Erholung im eigenen Zelt und geregelter Abreise
- langlebige Campingaufenthalte mit Zeltabbau erst bei Parkschließung
- soziale Treffpunkte zwischen den Zelten sowie sichtbare Gespräche und Schlafanzeigen
- inventarabhängig belegte Nachbarparzellen mit Campingstühlen, Pavillons oder kleinen Musikboxen
- gemeinsame Stuhlfelder für bis zu fünf nahe Camper und Pavillons für sechs Personen
- begehbare Campingflächen mit Sitzen, Gesprächen sowie Verzehr mitgebrachter Vorräte
- individuelle Besucher-Inventare mit Zelt, Stühlen, Pavillon, Musikbox, Alkohol, Essen und Feuerwerkskörpern
- zufälliges Zünden mit Verbrauch und sichtbaren Feuerwerkseffekten
- unbegrenzter Besucherzustrom mit lokaler Gedränge- und Festivallust-Simulation
- zuschaltbares Gedränge-Overlay mit durchschnittlicher Parkauslastung
- getrennte Karten-Overlays für lokale Attraktivität und Partystimmung mit abflachender Quellenaddition
- Dekoration mit Bäumen, Hecken, automatisch am Wegrand ausgerichteten Bänken und Beleuchtung
- Festivalbühnen, gerichtete sowie omnidirektionale Lautsprecher und ausweisbare Bühnenvorplätze
- maximal neun feiernde Besucher je Vorplatzfeld, lokale Tanz-Hotspots und Stimmungsverstärkung durch Tänzer
- individuelle Vorlieben für schöne Umgebung und Partystimmung sowie Meidung von Feuer, Kotze und Schlafenden
- kleine Camping-Musikboxen und Gespräche als lokale Stimmungsquellen
- sortier- und durchsuchbare Besucherübersicht mit Seitenansicht für große Besuchermengen
- vollständiger Tag-Nacht-Zyklus mit zehn realen Minuten pro Spieltag, Sonnenstand, Dämmerung und Nachtbeleuchtung
- 24-Stunden-Tagesplan für Bühnen, Buden, Toiletten, Fahrgeschäfte und Lampen
- getrennte Tages- und Campingtickets mit festgelegtem Einlass- und Räumungsfenster für Tagesgäste
- individuelle Schlafrhythmen; Camper schlafen nachts und früh morgens in ihren Zelten
- auf Tageslängen abgestimmte Hunger-, Toiletten-, Spaß- und Energieraten
- individuelle Positionen innerhalb eines Wegfeldes für natürlichere Besuchergruppen
- bevorzugte Aufenthaltsorte anhand persönlicher Schönheits- und Partyvorlieben statt ziellosem Umherlaufen
- entstehende Besuchergruppen, Gespräche, gemeinsames Essen und Trinken sowie dynamische Feier-Hotspots
- Stände verkaufen Essen und Getränke ins Inventar; konsumiert wird erst später im Stehen oder Sitzen
- gedrängebewusste A*-Wegsuche, die freie Alternativen ohne große Umwege bevorzugt
- Personalverwaltung für Reinigung, Sicherheit, Feuerwehr und Sanitäter mit laufenden Lohnkosten
- Sanitäter wählen für Transporte stets das über die Wegstrecke nächstgelegene freie Krankenbett
- deutlich erkennbare Personalmodelle mit rollenabhängigen Uniformen und Mützen
- gerichtete normale Wege mit dreh- und entfernbaren Bodenmarkierungen
- automatisch besetzte Einbahn-Sicherheitsschleusen mit konfigurierbaren Verboten und Kontrollgründlichkeit
- ausweisbare Krankenbereiche mit drei Liegen pro Feld und Sanitätertransport für Bewusstlose
- alkohol- und toilettenabhängige Übelkeit sowie zusätzliche Übelkeit nach alkoholisierten Fahrten
- sichtbare Verschmutzungen, die von Reinigungskräften gesucht und beseitigt werden
- versetzte Kotzeflecken pro Feld und vollständige Reinigung des nächstgelegenen Feldes
- lokales, nicht ausbreitendes Brandrisiko durch betrunken gezündetes Feuerwerk
- patrouillierende Feuerwehrkräfte, die lokale Brände löschen
- kompaktes Baumenü mit ausfahrenden Kategorien für Versorgung, Camping, Attraktionen und Notfallversorgung
- generisches Achterbahnsystem mit erweiterbarem Typ- und Schienenkatalog
- fortgesetzter Schienenbau mit Station, Geraden, sanften/steilen Steigungen und Kurven 1×1 bis 4×4
- explizite, weich gesampelte Übergangsstücke zwischen den Höhenneigungen
- RCT2-artige seitliche Neigung mit Einleitungs- und Ausleitungsstücken
- optionale Kettenzüge auf ansteigenden Schienenelementen
- Stationsplattformen bestimmen die Anzahl der Wagen und die Zugkapazität
- separat anzubauender Achterbahn-Eingang und -Ausgang
- fahrender Achterbahnzug mit konfigurierbarer Abfahrt
- einzeln entlang der Schienenkurve ausgerichtete Wagen mit sichtbaren Fahrgästen
- gemeinsamer Track-Rahmen für kontrolliertes Rollen von Schienen und Wagen
- echte Besucher laufen zum Eingang, warten und steigen nacheinander ein
- Fahrgäste bleiben während der Fahrt als dieselben Besucher ihren Sitzen zugeordnet
- sequenzielles Aussteigen am Ausgang und anschließende Rückkehr ins Wegnetz
- gerichtete Warteschlangenwege mit seitlichen Begrenzungen
- kleinere Besucher mit individuellen Gehgeschwindigkeiten und Laufanimation
- sichtbare Emotionssymbole und emotionale Laufstile
- trauriges Schlurfen, wütendes Gehen und Freudensprünge nach guten Fahrten
- zweireihige Warteschlangen mit zwei Plätzen pro Wegsegment
- reservierte Reihenplätze, geordnetes Nachrücken und begrenztes Einsteigen
- Kapazitätsgrenzen und temporäre Attraktionswahl bei voller Schlange
- schnelle Evakuierung zum nächsten sicheren Weg nach einem Wegabriss
- längenbasierte Fahrphysik mit Gravitation, Rollreibung, Luftwiderstand und Stationsbremse
- automatischer Stationskettenantrieb für Anschub und kontrolliertes Einziehen
- angetriebener Kettenlift und mögliches Zurückrollen bei zu wenig Energie
- allgemeines Gebäude- und Attraktionsfenster mit Betriebsoptionen
- Achterbahn-Betriebsmodi „Geschlossen“, „Geöffnet“ und „Testbetrieb“
- manuelle sichere Rückholung des aktuellen Zuges zur Station
- Schienenelement-Navigation mit sichtbarer Markierung und Rückbau ab Auswahl
- lokaler Spielstand über `localStorage`
- responsive Benutzeroberfläche
- zentrale Balancing-Werte in `src/game/simulationConfig.ts`
- gedrosselte UI-/Gedrängeupdates und indizierte Weg-/Besuchersuche für große Besuchermengen

## Steuerung

- Linksklick: Werkzeug anwenden
- mittlere oder rechte Maustaste ziehen: Kamera verschieben
- Mausrad: zoomen
- Q / E: Kamera um 90 Grad drehen
- R: Gebäudezugang um 90 Grad drehen
- Shift + Mausrad oder Bild hoch/runter: Bauhöhe ändern
- 1–9: Werkzeug wählen, 0: Achterbahn
- Leertaste: pausieren / fortsetzen
- Besucher anklicken: Gedanken und Bedürfnisse öffnen

### Wege-Editor

1. Beim Werkzeug „Weg“ den Wege-Editor öffnen.
2. Einen bestehenden Weg als Startpunkt anklicken.
3. Richtung und Neigung für das nächste Segment wählen.
4. „Bauen“ drücken; der neue Weg wird zum nächsten Bauanker.
5. „Rückgängig“ entfernt das letzte Segment und setzt den Anker zurück.
6. Am gewählten normalen Weg kann eine Laufrichtung gesetzt, gedreht oder wieder freigegeben werden.

Tastatur: `R` oder Pfeiltasten drehen, `Enter` baut und `Backspace` nimmt das letzte Segment zurück.

Richtungen werden als diagonale Pfeile der aktuellen isometrischen Kameraansicht angezeigt. Nach dem Drehen der Kamera passen sich die Symbole automatisch an.

Der Wegtyp „Warteschlange“ steht ausschließlich in diesem Editor zur Verfügung. Die Einbahnrichtung und die Öffnungen der Absperrungen werden automatisch vom angeschlossenen Attraktionseingang aus berechnet. Besucher mit einem Attraktionsziel stellen sich darin geordnet auf; normale Parkbesucher verwenden diese Wege nicht. Am hinteren Ende muss ein normaler Weg liegen.

### Achterbahn-Editor

1. Im Baumenü „Achterbahn“ wählen und auf dem Gelände einen Startpunkt setzen.
2. Startpunkt, Bauhöhe und Startrichtung in der Vorschau anpassen und erst dann „Startplattform bauen“ drücken.
3. Schienenelement wählen und über „Schiene bauen“ fortsetzen.
4. Beim Wechsel zwischen flach, sanft und steil setzt der Editor automatisch ein erforderliches Übergangsstück ein.
5. Seitliche Neigung links oder rechts muss vor einer Kurve eingeleitet und vor Stationen wieder neutral ausgeleitet werden. Nachfolgende Kurven übernehmen die gesetzte Neigung.
6. Weitere Stationsplattformen verlängern den Zug um jeweils einen Wagen.
7. Bei Steigungen kann optional ein Kettenzug aktiviert werden.
8. Eingang und Ausgang auf getrennten Feldern neben Stationsplattformen anbauen.
9. Die Strecke zum Startpunkt mit gleicher Höhe, Richtung, Höhenneigung und Seitenneigung zurückführen.

Eine Bahn fährt erst, wenn Strecke, Eingang und Ausgang vollständig sind. Mit dem Info-Werkzeug lässt sich anschließend einstellen, ob der Zug bei voller Belegung, nach einer festen Wartezeit oder beim ersten eintretenden Ereignis abfährt.

Eine noch nicht vollständige Achterbahn kann mit dem Info-Werkzeug angeklickt werden. Sie wird dadurch erneut im Achterbahn-Editor geöffnet und am Endanker des letzten vorhandenen Schienenelements fortgesetzt.

Im Attraktionsfenster kann eine geschlossene Strecke geöffnet oder ohne Besucher im kontinuierlichen Testbetrieb gefahren werden. „Wagen zurückholen“ setzt den Zug sicher an die Station; vorhandene Fahrgäste werden dabei über den Ausgang zurück in den Park geführt.

Über „Strecke bearbeiten“ lässt sich jede Bahn erneut öffnen. Vor- und Zurück-Schaltflächen markieren die vorhandenen Elemente nacheinander. „Markiertes Element löschen“ entfernt ausschließlich dieses Element und setzt den Bauanker auf das davorliegende Segment. Die späteren Segmente bleiben erhalten; die Strecke gilt als unterbrochen, bis neue Elemente die Lücke geometrisch korrekt schließen.

Ein kurzer Rechtsklick auf einen Schienenabschnitt setzt den Bauanker im geöffneten Achterbahn-Editor direkt auf dieses Element. Rechtsziehen bewegt weiterhin die Kamera.

Die Fahrphysik verwendet konfigurierbare SI-Parameter pro Achterbahntyp. Die Hangabtriebskraft wird über alle Wagenpositionen gemittelt, damit ein teilweise auf einer Steigung befindlicher Zug plausibel reagiert. Ohne ausreichende Geschwindigkeit oder Kettenlift kann ein Zug an einer Steigung ausrollen und zurückrollen.

## Architektur

- `src/game/catalog.ts`: Datenkatalog und Balancingwerte
- `src/game/GameState.ts`: deterministischer Spielzustand, Regeln, Zeit und Wirtschaft
- `src/view/WorldView.ts`: Three.js-Szene, Modelle, Kamera und Picking
- `src/main.ts`: UI, Eingaben und Verknüpfung der Systeme

Die Simulation kennt Three.js nicht. Dadurch kann sie später unabhängig getestet, auf einem Server ausgeführt oder durch ein komplexeres Besucher- und Wegfindungssystem ersetzt werden.

## Sinnvolle nächste Ausbaustufen

1. Warteschlangen, Kapazitätsgrenzen und Servicequalität
2. Besuchergruppen, Eigenschaften und differenzierte Vorlieben
3. Bauflächen unterschiedlicher Größe und Gebäude-Rotation
4. Geländeformung und weitere Zonentypen
5. Personal, Forschung, Marketing und detaillierte Finanzen
6. Szenarien, Ziele sowie versionierte Spielstände
7. eigene Modelle, Sounds und Animationen

RollerCoaster Tycoon 2 dient nur als Referenz für Spielprinzipien. Namen, Grafiken, Sounds, Daten und sonstige geschützte Inhalte sollten nicht übernommen werden.


## Festivalbetrieb und automatische Logistik

Neue Szenarien beginnen geschlossen in der Planung. Die Tagesplanung legt Vorlauf, Festivaltage und Angebotszeiten fest; erst **Festival starten** setzt die Festivalzeit in Gang. Nach dem Ende bleiben Abreise und Reinigung aktiv, der Park bleibt bis zum nächsten Start geschlossen. Bestehende laufende Spielstände behalten ihren Ablauf.

In der Logistikansicht einen **Anlieferungsplatz** neben einer Straße und mit Fußwegzugang bauen. Danach **Depots** an Fußwegen setzen, Mindestbestände festlegen und mehrere Träger zuweisen. Bestellungen kosten Warenpreis plus 45 € Fracht. Lastwagen liefern zum Anlieferungsplatz; Träger holen dort Waren physisch ab und bringen sie ins Depot. Depots versorgen Stände automatisch bis zum Zielbestand von 40 Einheiten. Als **Zwischenlager** freigegebene Depots geben zusätzlich Ware an andere Depots ab. Träger kosten einmalig 120 € und anschließend 0,04 €/Spielminute. Alte manuelle Warenrouten bleiben nutzbar.

Käufer gehen nach dem Einkauf vom Tresen weg. Stände zeigen ihren Vorrat als farbigen Balken und als Zahl im Infofenster. Reinigungskräfte bringen gesammelten Bodenmüll zuerst zum nächsten erreichbaren Mülleimer; Eimerinhalte werden von Reinigungskräften zur Müllablage gebracht, Müllwagen übernehmen die weitere Abfuhr. Alte Müllträger beenden vorhandene Ladungen und werden anschließend aus dem Logistiksystem entfernt.

**Personaltore** werden auf Fußwege gesetzt und sperren diese Kachel für Besucher; Personal und Warenlogistik dürfen passieren. Für einen vollständig getrennten Bereich muss das Tor mit Zäunen bzw. geschlossenen Grenzen kombiniert werden. Personalfiguren oder Namen in der Personalverwaltung anklicken: Das Infofenster bietet Verfolgen und einen rechteckigen Arbeitsbereich. Der Bereich wird bei Auswahl türkis markiert. Abhol-/Einsatzorte liegen im zugewiesenen Bereich; notwendige Entsorgungs-, Rettungs- und Rückwege dürfen hinausführen. Automatische Träger können ebenfalls angeklickt und einem Bereich zugewiesen werden.


### Ticketplanung und Bühnenwerkstatt

In der Festivalübersicht lassen sich Tagestickets **je Festivaltag** und Campingtickets **je Ausgabe** festlegen. Campingfelder, Sicherheitsreserve, buchbare und belegte Plätze sowie geplante Auslastung werden angezeigt. Kontingente sind nach Festivalstart gesperrt. Anreisen verbrauchen Tickets dauerhaft, auch wenn Gäste wieder abreisen; Tageskontingente beginnen am nächsten Tag neu. Nachfrage und Einlasszeiten gelten weiterhin, der Eintritt wird bei Anreise bezahlt. Neue Szenarien starten mit 150 Tagestickets und 0 Campingtickets. Alte Spielstände ohne Kontingente behalten ihren bisherigen Zulauf, bis Ticketzahlen festgelegt werden.

Die **Bühnenwerkstatt** öffnet über die obere Leiste oder **Bühne gestalten** im Infofenster einer Bühne. Das Detailraster (4–12 breit/tief) ist unabhängig von der Kartengrundfläche (1–8 Felder je Achse). Neue Entwürfe starten auf 2 × 2 Feldern; bisherige Entwürfe ohne Flächenangabe behalten 1 × 1 Feld. Die vollständige gedrehte Fläche muss frei, eben und tragfähig sein. Größere Flächen kosten zusätzlich Fundament und Unterhalt. Vergrößerungen werden vor dem Bezahlen geprüft; Wegfindung, Abriss und Kollisionen berücksichtigen jedes belegte Feld. Ein Klick auf ein Bauteil aktiviert die Platzierung und öffnet dessen Qualitätsmenü. Die Vorschau am Mauszeiger zeigt gültige Plätze grün und ungültige rot. R bzw. Rechtsklick dreht das Bauteil, Umschalt+R dreht zurück; alternativ gibt es Drehpfeile über der Vorschau. Bauteile rasten beim Zeigen auf Traversen automatisch ein; Alt erzwingt Bodenmontage. Lautsprecher lassen sich durch Zeigen auf einen vorhandenen Stapel bis zu vierfach stapeln. Das Entfernen eines Trägers entfernt auch abhängige Teile. Rückgängig stellt die vorige Konstruktion wieder her.

Mit **Zuschauerfläche** werden einzelne Kartenfelder innerhalb der Bühne zu begehbaren Bereichen, etwa für U-förmige Bühnen und Innenhöfe. Jede Fläche benötigt eine Verbindung zum Bühnenrand und anschließend einen Zugang vom Gelände. Bodenbauteile und Traversenstützen dürfen diese Flächen nicht blockieren. Zuschauerflächen werden mit der Bühne gedreht und gespeichert.

Warm-up (erste 20 %), Main (20–80 %) und Finale (letzte 20 %) haben eigene Licht-, Tempo-, Nebel-, Lautstärke- und Farbregler; alternativ gelten die Warm-up-Regler für alle Phasen. Nebelmaschinen verteilen breite, bodennahe Nebelschichten. Moving Heads werfen sichtbare Lichtkegel und beleuchten Oberflächen: aufgehängt nach unten, am Boden nach oben. Laser erzeugen animierte Strahlenfächer. Für die Beleuchtung teilen sich Bühnen auf der Karte sechs aktive Spots, um die Renderkosten zu begrenzen. Die Vorschau läuft unabhängig von der Festivalzeit. Auf der Karte richten sich die Effekte nach aktivem Auftritt und Stromstatus. Lautstärke beeinflusst den zusätzlichen Konzertspaß und nächtliche Schlafstörungen; Technik und Dekoration verbessern die Atmosphärenwerte. Integrierte Lautsprecher zählen für die Anforderungen der Bands.

Vorlagen kosten beim Speichern nichts. **Für Bühnenbau verwenden** wählt die Konstruktion für neue Bühnen; berechnet werden Grundbühne plus Ausstattung. Umbauten berechnen nur einen positiven Ausstattungs-Kostenunterschied, ohne Erstattung bei Rückbau. Technik erhöht Strombedarf und Unterhalt. **Standardbühne bauen** schaltet zurück. Vorlagen bleiben im Spielstand (einschließlich Base64 und Multiplayer) und zusätzlich im lokalen Browser-Vorlagenspeicher für neue Szenarien erhalten. Bis zu 30 Vorlagen und 96 Teile je Bühne werden unterstützt; statische Geometrien werden nach Material gebündelt, dynamische Effekte sind auf 32 je Bühne begrenzt.

Motortraversen bewegen ihre angehängten Bauteile gemeinsam vertikal. Der Showregler **Traversenhub** bestimmt den Hub, **Bewegung / Tempo** die Geschwindigkeit; der Fahrbereich am Boden bleibt frei. **Feuerwerksmodul** und **Funkenfontäne** werden am Boden platziert und über **Feuerwerk / Funken** je Showphase gesteuert. Ohne aktiven, versorgten Auftritt bleiben die Effekte aus. Vorhandene Vorlagen ohne diese Regler behalten Hub und Pyrotechnik auf null. Neue Entwürfe steigern beide Werte bis zum Finale. Kosten, Strombedarf und Partywerte berücksichtigen die neuen Module.

Gebuchte Bands stehen während gültiger, stromversorgter Auftritte als animierte Pixel-Musiker auf Standard- und selbstgebauten Bühnen. Die Besetzung unterscheidet Gitarren, Gesang, Schlagzeug, Bläser und Keyboards passend zur Band. Auf selbstgebauten Bühnen stehen Musiker ausschließlich auf platzierten Bühnenpodesten und in deren korrekter Höhe. Zuschauerfelder, andere Bodenaufbauten und Motortraversen-Fahrbereiche bleiben frei. Ohne Podeste erscheinen keine Musiker; für eine vierköpfige Band werden vier Podeste benötigt. Standardbühnen nutzen ihre feste Plattform. Die Bühnenwerkstatt bietet eine abschaltbare Indie-Bandvorschau zur Platzplanung. Musiker sind eine visuelle Darstellung der vorhandenen Buchung; diese Erweiterung erzeugt keine Musik-Audiospur.

### Musikpublikum und Bühnenzeitplan

Unter **Bands & Spielplan** stehen die Bandbibliothek und ein Zeitraster pro Bühne nebeneinander. Tag und Auftrittsdauer wählen, dann eine Band auf die gewünschte Startzeit ziehen. Alternativ zuerst Band und dann Zeitblock anklicken. Bereits gebuchte Auftritte lassen sich ebenso zwischen Bühnen und Zeiten verschieben, ohne weitere Gage. Das Raster zeigt die Öffnungszeiten der Bühnen laut Tagesplan und 30 Minuten Umbauzeit. Überschneidungen, fehlender Ruf, Budget und unzulässige Zeiten werden vor jeder Änderung geprüft. Bereits vor Festivalstart kann verbindlich gebucht werden; das Programm bleibt beim Start erhalten und die vorab bezahlten Gagen zählen zur Festivalbilanz.

Acht eigenständige Musikgeschmäcker ergänzen die bisherigen sozialen Zielgruppen: **Folk, Indie, Rock, Metal, Electro, Dance, Pop, Soul**. Die Reihenfolge im Farbkreis bildet eine vereinfachte musikalische Nachbarschaft ab. Bandkarten zeigen die Geschmackspassung für alle acht Gruppen, Gage, Zugkraft und technische Anforderungen. Kreisdiagramme vergleichen die dauerhafte Besucherbasis, erwartete Gäste und die nach Spielminuten gewichtete Genreverteilung des Programms. Die Prognose besteht aus 75 % Basis und 25 % Programm; Ticketkontingente und tatsächliche Nachfrage begrenzen weiterhin die Anreisen.

Besucher behalten ihren individuellen Musikgeschmack, wählen bevorzugt passende Auftritte und meiden stark abweichende Genres auch bei der allgemeinen Suche nach Partyorten. Ähnliche Musikrichtungen werden teilweise akzeptiert. Gleichzeitige ähnliche Programme konkurrieren um dieselben Musikfans; unterschiedliche Genres helfen, Besucher zu verteilen. Der Musikgeschmack steht im Besucherinfofenster.

Nach dem Festival entwickelt sich die Basis einmalig aus 80 % bisheriger Basis, 18 % tatsächlich gespieltem, nach Zugkraft gewichtetem Programm und 2 % gleichmäßigem Grundinteresse weiter. Ausgefallene oder nur gebuchte Auftritte zählen nicht. Ohne gespielte Musik bleibt die Basis gleich. **Nächste Ausgabe vorbereiten** öffnet die Planung bei geschlossenem Park, behält die gewachsene Basis und startet die Uhr erst mit **Festival starten**. Geschmack, Buchungen und Entwicklung bleiben in Spielständen, Base64-Export und Multiplayer erhalten; alte Spielstände beginnen ohne vorhandene Genredaten mit gleichen Anteilen.

### Mehrere lokale Spielstände

Über **Spielstände** in der oberen Leiste lassen sich bis zu 20 benannte Spielstände speichern, laden, überschreiben und löschen. Beim lokalen Entwicklungs- oder Spielserver liegen sie als einzelne JSON-Dateien im Ordner `saves` neben dem Projekt und stehen damit allen Browsern zur Verfügung, die diesen Server verwenden. Ohne erreichbaren Spielserver verwendet das Spiel automatisch einen gleichwertigen Browser-Speicher als Ausweichlösung. **Speichern** und **Laden** bleiben als schneller Einzelspielstand erhalten; Base64-Export und -Import bleiben unabhängig davon nutzbar.
