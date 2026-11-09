/* ==========================================================
   billDsmart – Plattform (Demo/Prototyp)
   Läuft komplett im Browser. Alle Daten liegen im localStorage
   dieses Browsers, damit Bauherrschaft und Unternehmer denselben
   Vertrag sehen, wenn man sich nacheinander anmeldet.
   Es werden keine echten Zahlungen oder E-Mails ausgelöst.
   ========================================================== */
"use strict";

const STORE_KEY = "billDsmart-demo-v2";
const LANG_KEY = "billDsmart-lang";
const FEE_RATE = 0.003;
const DAY = 86400000;
const PROJECT_LOC = { lat: 47.3471, lon: 8.7209 }; // Uster ZH
const MAX_FILE = 800 * 1024; // grössere Dateien werden nur mit Namen gespeichert

/* ---------- Personen im Demo-Vertrag (fiktiv) ---------- */
const PEOPLE_RAW = {
  client: {
    name: { de: "Nina Muster", en: "Nina Sample" }, first: "Nina", org: "", initials: { de: "NM", en: "NS" },
    email: "private.client@gmail.com", address: { de: "Musterweg 5, 8610 Uster", en: "Sample Street 5, 8610 Uster" },
    iban: "CH00 0000 0000 0000 0000 1",
  },
  contractor: {
    name: { de: "Sandro Beispiel", en: "Sandro Example" }, first: "Sandro", org: { de: "Malerei Beispiel GmbH", en: "Example Painting Ltd" }, initials: { de: "SB", en: "SE" },
    email: "constructor@gmail.com", address: { de: "Werkstrasse 1, 8610 Uster", en: "Workshop Road 1, 8610 Uster" },
    uid: "CHE-000.000.001", iban: "CH00 0000 0000 0000 0000 2",
  },
};
// PEOPLE.client.name usw. liefert automatisch die Fassung der gewählten Sprache
const PEOPLE = new Proxy({}, {
  get: (_, role) => {
    const r = PEOPLE_RAW[role];
    if (!r) return undefined;
    const out = {};
    Object.keys(r).forEach((k) => { out[k] = loc(r[k]); });
    return out;
  },
});
const other = (role) => (role === "client" ? "contractor" : "client");

/* ---------- Meilensteine des Demo-Vertrags ---------- */
const MS_SEED = [
  { id: "m1", amount: 6000, dueDays: 7,
    name: { de: "Vorbereitung und Abdeckarbeiten", en: "Preparation and masking" },
    criteria: { de: "Gerüst gestellt, Fenster und Böden abgedeckt, Untergrund geprüft", en: "Scaffolding up, windows and floors covered, substrate checked" },
    tasks: [{ de: "Gerüst stellen lassen", en: "Have scaffolding put up" }, { de: "Fenster und Türen abkleben", en: "Mask windows and doors" }, { de: "Untergrund prüfen und dokumentieren", en: "Check and document substrate" }] },
  { id: "m2", amount: 18000, dueDays: 28,
    name: { de: "Fassade", en: "Façade" },
    criteria: { de: "Fassade gewaschen, grundiert und zweimal gestrichen, Farbton gemäss Farbkonzept", en: "Façade washed, primed and painted twice, colour as per colour concept" },
    tasks: [{ de: "Fassade waschen", en: "Wash façade" }, { de: "Risse ausbessern", en: "Repair cracks" }, { de: "Grundierung", en: "Primer" }, { de: "Zwei Anstriche", en: "Two coats" }] },
  { id: "m3", amount: 9000, dueDays: 42,
    name: { de: "Treppenhaus", en: "Stairwell" },
    criteria: { de: "Wände und Decken gestrichen, Geländer lackiert", en: "Walls and ceilings painted, railings lacquered" },
    tasks: [{ de: "Wände spachteln", en: "Fill walls" }, { de: "Decken streichen", en: "Paint ceilings" }, { de: "Geländer lackieren", en: "Lacquer railings" }] },
  { id: "m4", amount: 12000, dueDays: 63,
    name: { de: "Wohnungen innen", en: "Apartment interiors" },
    criteria: { de: "Sechs Wohnungen gestrichen, Abnahme pro Wohnung mit Fotos", en: "Six apartments painted, acceptance per apartment with photos" },
    tasks: [{ de: "Wohnungen 1 bis 3", en: "Apartments 1 to 3" }, { de: "Wohnungen 4 bis 6", en: "Apartments 4 to 6" }, { de: "Fotos pro Wohnung hochladen", en: "Upload photos per apartment" }] },
  { id: "m5", amount: 3000, dueDays: 70,
    name: { de: "Schlussabnahme", en: "Final acceptance" },
    criteria: { de: "Mängelliste erledigt, Schlussrundgang mit der Bauherrschaft", en: "Defects list completed, final walkthrough with the client" },
    tasks: [{ de: "Mängelliste abarbeiten", en: "Work through defects list" }, { de: "Schlussrundgang", en: "Final walkthrough" }] },
];
const TOTAL = MS_SEED.reduce((s, m) => s + m.amount, 0);

/* ---------- Unabhängige Fachpersonen (fiktive Beispielkontakte) ---------- */
const EXPERTS = [
  { id: "e1", name: { de: "lic. iur. Petra Amrein", en: "Petra Amrein, LL.M." }, kind: "mediation", city: { de: "Zürich", en: "Zurich" }, canton: "ZH", lat: 47.3769, lon: 8.5417, langs: "DE, EN" },
  { id: "e2", name: { de: "Bauschlichtung Oberland, Urs Gisler", en: "Oberland Construction Arbitration, Urs Gisler" }, kind: "arbitration", city: { de: "Wetzikon", en: "Wetzikon" }, canton: "ZH", lat: 47.3264, lon: 8.7977, langs: "DE" },
  { id: "e3", name: { de: "Dr. iur. Reto Baumann, Baurecht", en: "Dr Reto Baumann, construction law" }, kind: "law", city: { de: "Winterthur", en: "Winterthur" }, canton: "ZH", lat: 47.4988, lon: 8.7237, langs: "DE" },
  { id: "e4", name: { de: "Mediation am See, Claudia Frei", en: "Lakeside Mediation, Claudia Frei" }, kind: "mediation", city: { de: "Rapperswil-Jona", en: "Rapperswil-Jona" }, canton: "SG", lat: 47.2266, lon: 8.8184, langs: "DE, EN" },
  { id: "e5", name: { de: "Bauschlichtung Zentralschweiz, Marco Odermatt", en: "Central Switzerland Construction Arbitration, Marco Odermatt" }, kind: "arbitration", city: { de: "Zug", en: "Zug" }, canton: "ZG", lat: 47.1662, lon: 8.5155, langs: "DE, EN" },
  { id: "e6", name: { de: "lic. iur. Simone Wyss", en: "Simone Wyss, LL.M." }, kind: "law", city: { de: "Aarau", en: "Aarau" }, canton: "AG", lat: 47.3925, lon: 8.0442, langs: "DE, FR" },
  { id: "e7", name: { de: "Mediation Pilatus, Andrea Amstutz", en: "Pilatus Mediation, Andrea Amstutz" }, kind: "mediation", city: { de: "Luzern", en: "Lucerne" }, canton: "LU", lat: 47.0502, lon: 8.3093, langs: "DE" },
  { id: "e8", name: { de: "Bau-Mediation Bern, Thomas Kunz", en: "Bern Construction Mediation, Thomas Kunz" }, kind: "mediation", city: { de: "Bern", en: "Bern" }, canton: "BE", lat: 46.9480, lon: 7.4474, langs: "DE, FR" },
  { id: "e9", name: { de: "Dr. iur. Sarah Meier-Roth", en: "Dr Sarah Meier-Roth" }, kind: "law", city: { de: "Basel", en: "Basel" }, canton: "BS", lat: 47.5596, lon: 7.5886, langs: "DE, EN" },
  { id: "e10", name: { de: "Schlichtung Ostschweiz, Daniel Keller", en: "Eastern Switzerland Arbitration, Daniel Keller" }, kind: "arbitration", city: { de: "St. Gallen", en: "St. Gallen" }, canton: "SG", lat: 47.4245, lon: 9.3767, langs: "DE" },
  { id: "e11", name: { de: "Mediation Graubünden, Anna Caduff", en: "Graubünden Mediation, Anna Caduff" }, kind: "mediation", city: { de: "Chur", en: "Chur" }, canton: "GR", lat: 46.8508, lon: 9.5320, langs: "DE, IT" },
  { id: "e12", name: { de: "lic. iur. Marc Python", en: "Marc Python, LL.M." }, kind: "law", city: { de: "Freiburg", en: "Fribourg" }, canton: "FR", lat: 46.8065, lon: 7.1620, langs: "FR, DE" },
  { id: "e13", name: { de: "avv. Luca Bernasconi", en: "Luca Bernasconi, attorney" }, kind: "arbitration", city: { de: "Lugano", en: "Lugano" }, canton: "TI", lat: 46.0037, lon: 8.9511, langs: "IT, DE" },
  { id: "e14", name: { de: "Me Isabelle Rochat", en: "Isabelle Rochat, attorney" }, kind: "law", city: { de: "Lausanne", en: "Lausanne" }, canton: "VD", lat: 46.5197, lon: 6.6323, langs: "FR, EN" },
  { id: "e15", name: { de: "Médiation Léman, Julien Favre", en: "Lake Geneva Mediation, Julien Favre" }, kind: "mediation", city: { de: "Genf", en: "Geneva" }, canton: "GE", lat: 46.2044, lon: 6.1432, langs: "FR, EN" },
];
const expertById = (id) => EXPERTS.find((e) => e.id === id);
const expertName = (id) => { const e = expertById(id); return e ? loc(e.name) : id; };

/* ==========================================================
   Texte
   ========================================================== */
const T = {
  de: {
    title: "billDsmart – Plattform",
    skip: "Zum Inhalt springen",
    signIn: "Anmelden", email: "E-Mail", password: "Passwort", back: "Zurück zur Website",
    demoAccounts: "Demo-Zugänge", roleclient: "Private Bauherrschaft", rolecontractor: "Unternehmer",
    loginMissing: "Bitte geben Sie E-Mail und Passwort ein.",
    loginWrong: "E-Mail oder Passwort stimmt nicht. Nutzen Sie einen der Demo-Zugänge unten.",
    logout: "Abmelden",
    demoInfo: "Demo: Alle Daten bleiben in diesem Browser. Es fliesst kein echtes Geld und es werden keine echten E-Mails versendet.",
    scenStart: "Szenario Vertragsstart", scenRunning: "Szenario Projekt läuft", switchRole: "Rolle wechseln", reset: "Zurücksetzen",
    resetDone: "Demo auf «{s}» gesetzt.",
    nav: { overview: "Übersicht", contract: "Smart Contract", payments: "Zahlungen", milestones: "Meilensteine und Aufgaben", chat: "Chat und Dokumente", help: "Hilfe bei Uneinigkeit", premium: "Alle Projekte", profile: "Profil und Verifizierung" },
    premiumTag: "Premium",
    hello: "Guten Tag, {name}",
    yourRole: "Sie sind als {role} angemeldet.",
    nextStep: "Ihr nächster Schritt",
    next: {
      c_sign: ["Vertrag prüfen und unterschreiben", "{other} hat Ihnen den Vertrag mit fünf Meilensteinen geschickt und bereits unterschrieben."],
      c_deposit: ["Budget einzahlen", "Überweisen Sie CHF {amount}. Erst dann beginnt der Unternehmer mit der Arbeit."],
      c_review: ["Meilenstein {n} prüfen", "«{name}» ist als fertig gemeldet. Prüfen Sie die Arbeit und geben Sie sie frei oder beanstanden Sie sie."],
      k_waitsign: ["Warten auf Unterschrift", "Sie haben den Vertrag unterschrieben. Sobald {other} unterschreibt, wird der Smart Contract aktiv."],
      k_waitdeposit: ["Warten auf Einzahlung", "Fangen Sie erst an, wenn das Geld gesichert ist. Sie sehen es hier, sobald es eingetroffen ist."],
      k_report: ["Meilenstein {n} fertig melden", "Erledigen Sie die Aufgaben von «{name}» und melden Sie den Meilenstein mit Fotos als fertig."],
      k_waitreview: ["Warten auf Freigabe", "«{name}» ist gemeldet. {other} prüft die Arbeit."],
      dispute: ["Uneinigkeit klären", "Zu Meilenstein {n} gibt es eine Beanstandung. Der nächste Schritt wartet auf Sie."],
      disputeWait: ["Uneinigkeit wird geklärt", "Der Betrag von Meilenstein {n} bleibt gesichert, bis die Schlichtung abgeschlossen ist."],
      done: ["Projekt abgeschlossen", "Alle Meilensteine sind abgenommen und abgerechnet."],
      idle: ["Alles erledigt", "Im Moment gibt es für Sie nichts zu tun."],
    },
    go: "Öffnen",
    kpiLocked: "Gesichert im Smart Contract", kpiPaid: "Ausbezahlt", kpiOpen: "Noch offen", kpiProgress: "Fortschritt",
    kpiProgressVal: "{a} von {b} Meilensteinen",
    otherParty: "Vertragspartei", verified: "Verifiziert", writeMsg: "Nachricht schreiben",
    activity: "Letzte Aktivitäten", allActivity: "Alle anzeigen",
    contractTitle: "Vertrag {id}",
    status: { proposed: "Wartet auf Unterschrift", active: "Aktiv", completed: "Abgeschlossen" },
    parties: "Vertragsparteien", client: "Bauherrschaft", contractor: "Unternehmer",
    kycId: "Identität geprüft", kycCompany: "Firma geprüft ({uid})", kycBank: "Bankkonto bestätigt",
    terms: "Bedingungen", total: "Auftragssumme", fee: "Gebühr billDsmart (0,3 %)", feePaidBy: "bezahlt von {who}",
    currency: "Abwicklung", currencyVal: "Ein- und Auszahlung in CHF. Im Smart Contract als CHF-Stablecoin gesperrt (1 Token = 1 Franken).",
    disputeRule: "Bei Uneinigkeit", disputeRuleVal: "Der Betrag bleibt gesperrt. Schlichtung durch eine unabhängige Fachperson, Umsetzung erst nach notarieller Beglaubigung des Ergebnisses.",
    msTable: "Meilensteine und Freigabebedingungen", colMs: "Meilenstein", colCrit: "Abnahmekriterium", colAmount: "Betrag", colDue: "Fällig", colStatus: "Status", colDate: "Datum",
    signatures: "Unterschriften", signedOn: "unterschrieben am {d}", notSigned: "noch nicht unterschrieben",
    agree: "Ich habe die Bedingungen und Meilensteine gelesen und bin einverstanden.",
    signBtn: "Vertrag unterschreiben", signNeedAgree: "Bitte bestätigen Sie zuerst, dass Sie einverstanden sind.",
    signedToast: "Vertrag unterschrieben. Der Smart Contract ist aktiv.",
    contractAddr: "Adresse des Smart Contracts", protocol: "Protokoll des Smart Contracts",
    protocolHint: "Jeder Schritt wird fälschungssicher festgehalten. Die Transaktionsnummern sind in dieser Demo simuliert.",
    token: "CHF-Stablecoin",
    flowDeposited: "Eingezahlt", flowLocked: "Gesperrt im Smart Contract", flowPaid: "Ausbezahlt an Unternehmer", flowRefund: "Zurück an Bauherrschaft",
    depositTitle: "Budget einzahlen", depositNeedSign: "Sobald der Vertrag unterschrieben ist, können Sie hier das Budget einzahlen.",
    depositText: "Überweisen Sie den Betrag in Franken an unsere Partnerbank. Der regulierte Umtauschpartner tauscht ihn 1:1 in CHF-Stablecoin und sperrt ihn im Smart Contract. Sie brauchen keine Wallet.",
    payee: "Empfänger", payeeVal: "Partnerbank (Treuhand billDsmart)", iban: "IBAN", ref: "Referenz", amount: "Betrag",
    inclFee: "inkl. Gebühr CHF {fee}",
    simulateDeposit: "Zahlung simulieren",
    depositSteps: ["Zahlung bei der Partnerbank eingegangen", "1:1 in CHF-Stablecoin umgetauscht", "Im Smart Contract gesperrt"],
    depositDone: "Budget gesichert: {amount} {token} im Smart Contract.",
    depositedOn: "Am {d} eingezahlt: CHF {amount}",
    paymentsTable: "Zahlungsplan und offene Zahlungen",
    payoutAccount: "Ihr Auszahlungskonto", payoutAccountText: "Freigegebene Beträge kommen in Franken auf dieses geprüfte Firmenkonto.",
    payoutsList: "Erhaltene Zahlungen", noPayouts: "Noch keine Auszahlungen.",
    refundAccount: "Ihr Konto für Rückzahlungen",
    ms: { open: "Offen", reported: "Fertig gemeldet", disputed: "Beanstandet", paid: "Ausbezahlt", resolved: "Durch Schlichtung abgeschlossen" },
    due: "fällig {d}", criteria: "Abnahmekriterium", tasks: "Aufgaben", addTask: "Aufgabe hinzufügen", addTaskPh: "Neue Aufgabe",
    tasksDone: "{a} von {b} erledigt", evidence: "Nachweise",
    needDeposit: "Aktionen sind möglich, sobald das Budget eingezahlt ist.",
    reportBtn: "Fertig melden", approveBtn: "Freigeben", disputeBtn: "Beanstanden",
    waitApproval: "Wartet auf Freigabe durch die Bauherrschaft", waitReport: "Unternehmer arbeitet",
    inDispute: "Betrag bleibt gesperrt, bis die Uneinigkeit geklärt ist.", toHelp: "Zur Schlichtung",
    reportTitle: "Meilenstein {n} fertig melden", reportNote: "Notiz an die Bauherrschaft (optional)", reportPhoto: "Fotos als Nachweis (optional)",
    reportOpenTasks: "Achtung: {n} Aufgaben sind noch nicht abgehakt.",
    reportSubmit: "Fertig melden", reportedToast: "Meilenstein gemeldet. Die Bauherrschaft wird benachrichtigt.",
    approveTitle: "Meilenstein {n} freigeben", approveText: "Mit der Freigabe gibt der Smart Contract {amount} {token} frei. Der Umtauschpartner tauscht sie in Franken und die Partnerbank überweist CHF {amount} an {who}.",
    approveSubmit: "Freigeben und auszahlen", approvedToast: "Freigegeben. CHF {amount} sind unterwegs zu {who}.",
    disputeTitle: "Meilenstein {n} beanstanden", disputeText: "Der Betrag von CHF {amount} bleibt gesperrt. Beschreiben Sie, was nicht dem Abnahmekriterium entspricht. Danach können Sie gemeinsam eine unabhängige Fachperson wählen.",
    disputeReason: "Was ist nicht in Ordnung?", disputeReasonMissing: "Bitte beschreiben Sie kurz, was nicht in Ordnung ist.",
    disputeSubmit: "Beanstanden", disputedToast: "Beanstandet. Der Betrag bleibt gesperrt.",
    disputeBusy: "Es läuft bereits eine Schlichtung. Bitte schliessen Sie diese zuerst ab.",
    cancel: "Abbrechen", close: "Schliessen", save: "Speichern",
    chatTitle: "Projektchat", chatPh: "Nachricht schreiben", send: "Senden", attach: "Datei anhängen",
    docs: "Dokumente", docUpload: "Hochladen", docAll: "Alle",
    docType: { plan: "Plan", invoice: "Rechnung oder Offerte", photo: "Foto", contract: "Vertrag", agreement: "Schlichtung", other: "Sonstiges" },
    uploadedBy: "{who}, {d}", comments: "Kommentare", commentPh: "Kommentar schreiben", commentBtn: "Kommentieren", noComments: "Noch keine Kommentare.",
    docDemo: "Beispieldokument der Demo, keine Vorschau verfügbar.", docTooBig: "Die Datei ist für den Demo-Speicher zu gross. Sie wurde nur mit Namen gespeichert.",
    docNoPreview: "Keine Vorschau verfügbar.", openFile: "Datei öffnen", docType_label: "Art",
    attachedToast: "{name} hochgeladen.", storageFull: "Der Speicher des Browsers ist voll. Setzen Sie die Demo zurück oder laden Sie kleinere Dateien hoch.",
    helpTitle: "Hilfe bei Uneinigkeit",
    helpIntro: "Wenn Sie sich bei einem Meilenstein nicht einig sind, bleibt das Geld gesperrt. billDsmart vermittelt Ihnen unabhängige Fachleute aus der ganzen Schweiz. Die Kosten der Beratung tragen die Parteien.",
    helpSteps: ["Beanstandung", "Fachperson wählen", "Schlichtung", "Ergebnis hochladen", "Notarielle Beglaubigung", "Umsetzung"],
    noDispute: "Im Moment gibt es keine offene Uneinigkeit. Wenn die Bauherrschaft mit einem gemeldeten Meilenstein nicht einverstanden ist, wählt sie dort «Beanstanden».",
    dOpen: "Meilenstein {n} «{name}» wurde am {d} von {who} beanstandet:",
    dOpenNext: "Klären Sie die Sache zuerst im Chat. Wenn Sie sich nicht einigen, schlagen Sie unten eine Fachperson aus Ihrer Nähe vor.",
    dProposed: "{who} schlägt {expert} ({city}) als Fachperson vor.",
    dProposedWait: "Warten, bis {other} zustimmt.",
    accept: "Zustimmen", proposeOther: "Andere Person vorschlagen",
    dAccepted: "Beide Parteien haben {expert} gewählt. billDsmart hat die Fachperson per E-Mail informiert und ihr die Projektunterlagen freigegeben. Vereinbaren Sie direkt einen Termin.",
    mediationDone: "Schlichtung ist abgeschlossen",
    dUpload: "Laden Sie das Schreiben mit dem Ergebnis der Schlichtung hoch, zum Beispiel den Brief des Notariats. billDsmart schickt dem Notariat danach automatisch eine E-Mail mit der Bitte, das Schreiben mit seiner Unterschrift zu beglaubigen.",
    agreementFile: "Schreiben mit dem Ergebnis (PDF oder Foto)", useSample: "Beispieldokument der Demo verwenden",
    outcome: "Vereinbartes Ergebnis: Anteil an den Unternehmer", outcomeVal: "{pct} % = CHF {a} an {k}, CHF {b} zurück an {c}",
    notaryName: "Name des Notariats", notaryDefault: "Notariat Muster, Zürich", notaryEmail: "E-Mail des Notariats",
    uploadSubmit: "Hochladen und Notariat benachrichtigen",
    needFile: "Bitte laden Sie das Schreiben hoch oder verwenden Sie das Beispieldokument.",
    needNotary: "Bitte geben Sie Name und eine gültige E-Mail-Adresse des Notariats an.",
    dRequested: "Das Schreiben ist hochgeladen. billDsmart hat {notary} am {d} automatisch um die Beglaubigung gebeten.",
    dRequestedWait: "Sobald die Beglaubigung eintrifft, führt der Smart Contract die vereinbarte Aufteilung aus.",
    simulateNotary: "Beglaubigung durch das Notariat simulieren",
    dResolved: "Erledigt: {notary} hat das Ergebnis am {d} beglaubigt. CHF {a} gingen an {k}, CHF {b} zurück an {c}.",
    experts: "Unabhängige Fachpersonen", expertsHint: "Beispielkontakte, fiktiv. Sortiert nach Entfernung zur Baustelle in Uster.",
    allCantons: "Alle Kantone", allKinds: "Alle Fachgebiete",
    kind: { mediation: "Mediation", arbitration: "Bauschlichtung", law: "Baurecht" },
    km: "{km} km", nearby: "In Ihrer Nähe", propose: "Vorschlagen", chosen: "Gewählt",
    proposedToast: "{expert} vorgeschlagen. {other} wird benachrichtigt.",
    acceptedToast: "Fachperson bestätigt. Die E-Mail ist verschickt.",
    notaryToast: "Hochgeladen. Die E-Mail an das Notariat ist verschickt.",
    certifiedToast: "Beglaubigt. Die Aufteilung ist ausgeführt.",
    outbox: "Automatische E-Mails von billDsmart", outboxEmpty: "Noch keine E-Mails versendet.",
    outboxNote: "In der Demo werden die E-Mails hier angezeigt statt versendet.",
    mailTo: "An", mailSubject: "Betreff", mailSent: "Gesendet",
    mailMediatorSubject: "Neue Schlichtungsanfrage – Vertrag {id}",
    mailMediatorBody: "Guten Tag\n\nIm Projekt «{project}» (Vertrag {id}) haben sich {client} und {contractor} für Sie als unabhängige Fachperson entschieden.\n\nEs geht um Meilenstein {n} «{name}» über CHF {amount}. Begründung der Beanstandung: «{reason}»\n\nDie Projektunterlagen (Vertrag, Fotos, Chat zu diesem Meilenstein) sind für Sie freigegeben. Bitte nehmen Sie direkt mit beiden Parteien Kontakt auf.\n\nFreundliche Grüsse\nbillDsmart",
    mailNotarySubject: "Bitte um Beglaubigung: Schlichtungsergebnis zu Vertrag {id}",
    mailNotaryBody: "Guten Tag {notary}\n\nIm Projekt «{project}» (Vertrag {id}) haben {client} und {contractor} eine Schlichtung zu Meilenstein {n} «{name}» abgeschlossen. Das Schreiben «{file}» wurde am {d} auf billDsmart hochgeladen.\n\nVereinbartes Ergebnis: {pct} % (CHF {a}) an den Unternehmer, CHF {b} zurück an die Bauherrschaft.\n\nWir bitten Sie, das Schreiben mit Ihrer Unterschrift zu beglaubigen und damit zu bestätigen, dass es dem Ergebnis der Schlichtung entspricht. Über den sicheren Link in dieser E-Mail können Sie das Dokument einsehen und die Beglaubigung hochladen.\n\nErst nach Ihrer Beglaubigung führt der Smart Contract die Aufteilung aus.\n\nFreundliche Grüsse\nbillDsmart\ncontact@billDsmart.ch",
    premiumTitle: "Alle Projekte", premiumLead: "Mit Premium führen Generalunternehmer und Betriebe mit mehreren Baustellen alle Projekte in einem Dashboard und erhalten erweitertes Reporting.",
    premiumPrice: "CHF 290 pro Monat", premiumUnlock: "Vorschau öffnen", premiumPreview: "Vorschau mit Beispieldaten",
    pProject: "Projekt", pClient: "Bauherrschaft", pVolume: "Volumen", pLocked: "Gesichert", pPaid: "Ausbezahlt", pNext: "Nächster Meilenstein",
    reportingTitle: "Erweitertes Reporting", rOpen: "Offene Zahlungen total", rPaidMonth: "Ausbezahlt in den letzten 30 Tagen", rApproval: "Durchschnittliche Freigabedauer", rDays: "{n} Tage",
    rChart: "Auszahlungen pro Monat (alle Projekte)", rExport: "Export für die Buchhaltung (CSV)", planned: "geplant",
    profileTitle: "Profil und Verifizierung", company: "Firma", person: "Person", address: "Adresse",
    kycTitle: "Verifizierung (KYC)", kycDone: "abgeschlossen",
    kycSteps: { client: ["Identität bestätigt (Ausweis und Selfie-Video)", "Bankkonto bestätigt (Testüberweisung)"], contractor: ["Firma geprüft (UID und Handelsregister)", "Wirtschaftlich berechtigte Person erfasst", "Identität der zeichnungsberechtigten Person bestätigt", "Firmenkonto bestätigt (Testüberweisung)"] },
    noWallet: "Sie brauchen keine Wallet. Die Prüfung führt der regulierte Partner nach den Schweizer Regeln gegen Geldwäscherei durch.",
    ev: {
      proposed: "{who} hat den Vertrag erstellt und unterschrieben.",
      signed: "{who} hat unterschrieben. Der Smart Contract ist aktiv.",
      deposit: "CHF {amount} bei der Partnerbank eingegangen (inkl. Gebühr CHF {fee}).",
      minted: "CHF {amount} 1:1 in {token} umgetauscht.",
      locked: "{amount} {token} im Smart Contract gesperrt.",
      reported: "Meilenstein {n} «{name}» als fertig gemeldet.",
      approved: "Meilenstein {n} «{name}» freigegeben.",
      released: "{amount} {token} freigegeben und in Franken getauscht.",
      payout: "CHF {amount} auf das Konto von {to} überwiesen.",
      refund: "CHF {amount} an {to} zurücküberwiesen.",
      disputed: "Meilenstein {n} beanstandet. CHF {amount} bleiben gesperrt.",
      expertProposed: "{who} schlägt {expert} als Fachperson vor.",
      expertAccepted: "Beide Parteien haben {expert} gewählt.",
      mediationDone: "Schlichtung zu Meilenstein {n} abgeschlossen.",
      agreementUploaded: "{who} hat das Schlichtungsergebnis hochgeladen.",
      notaryEmailed: "E-Mail an {notary}: Bitte um Beglaubigung.",
      certified: "{notary} hat das Ergebnis beglaubigt.",
      completed: "Alle Meilensteine abgerechnet. Vertrag abgeschlossen.",
      message: "{text}",
    },
    msg1: "Guten Tag Frau Muster. Wie besprochen schicke ich Ihnen die Offerte und den Vertrag mit fünf Meilensteinen. Ich habe bereits unterschrieben.",
    msg2: "Danke, Herr Beispiel. Den Grundriss vom Treppenhaus und das Farbkonzept lade ich hier hoch.",
    msg3: "Ist der Farbton an der Fassade wie im Farbkonzept?",
    msg4: "Ja, genau der Farbton aus dem Konzept. Die Fassade ist fertig, Fotos sind beim Meilenstein.",
    cm1: "Bitte im Treppenhaus auch die Kellertüre mitstreichen.", cm2: "Machen wir, ist im Preis inbegriffen.",
    reasonSample: "An der Nordseite sind Farbunterschiede und Laufnasen sichtbar.",
    you: "Sie",
  },
  en: {
    title: "billDsmart – Platform",
    skip: "Skip to content",
    signIn: "Sign in", email: "Email", password: "Password", back: "Back to website",
    demoAccounts: "Demo accounts", roleclient: "Private client", rolecontractor: "Contractor",
    loginMissing: "Please enter your email and password.",
    loginWrong: "Email or password is incorrect. Use one of the demo accounts below.",
    logout: "Sign out",
    demoInfo: "Demo: all data stays in this browser. No real money moves and no real emails are sent.",
    scenStart: "Scenario contract start", scenRunning: "Scenario project running", switchRole: "Switch role", reset: "Reset",
    resetDone: "Demo set to “{s}”.",
    nav: { overview: "Overview", contract: "Smart contract", payments: "Payments", milestones: "Milestones and tasks", chat: "Chat and documents", help: "Help with disagreements", premium: "All projects", profile: "Profile and verification" },
    premiumTag: "Premium",
    hello: "Hello, {name}",
    yourRole: "You are signed in as {role}.",
    nextStep: "Your next step",
    next: {
      c_sign: ["Review and sign the contract", "{other} has sent you the contract with five milestones and already signed it."],
      c_deposit: ["Deposit the budget", "Transfer CHF {amount}. Only then will the contractor start work."],
      c_review: ["Review milestone {n}", "“{name}” has been marked as done. Check the work and approve or dispute it."],
      k_waitsign: ["Waiting for signature", "You have signed the contract. As soon as {other} signs, the smart contract becomes active."],
      k_waitdeposit: ["Waiting for deposit", "Only start once the money is secured. You'll see it here as soon as it arrives."],
      k_report: ["Mark milestone {n} as done", "Complete the tasks for “{name}” and mark the milestone as done with photos."],
      k_waitreview: ["Waiting for approval", "“{name}” has been reported. {other} is reviewing the work."],
      dispute: ["Resolve the disagreement", "Milestone {n} has been disputed. The next step is up to you."],
      disputeWait: ["Disagreement being resolved", "The amount for milestone {n} stays secured until mediation is complete."],
      done: ["Project complete", "All milestones are accepted and settled."],
      idle: ["All done", "There's nothing for you to do right now."],
    },
    go: "Open",
    kpiLocked: "Secured in smart contract", kpiPaid: "Paid out", kpiOpen: "Still open", kpiProgress: "Progress",
    kpiProgressVal: "{a} of {b} milestones",
    otherParty: "Contract party", verified: "Verified", writeMsg: "Send a message",
    activity: "Recent activity", allActivity: "Show all",
    contractTitle: "Contract {id}",
    status: { proposed: "Awaiting signature", active: "Active", completed: "Completed" },
    parties: "Parties", client: "Client", contractor: "Contractor",
    kycId: "Identity verified", kycCompany: "Company verified ({uid})", kycBank: "Bank account confirmed",
    terms: "Terms", total: "Contract value", fee: "billDsmart fee (0.3%)", feePaidBy: "paid by {who}",
    currency: "Settlement", currencyVal: "Deposits and payouts in CHF. Locked in the smart contract as CHF stablecoin (1 token = 1 franc).",
    disputeRule: "If you disagree", disputeRuleVal: "The amount stays locked. Mediation by an independent expert, carried out only after the result has been notarised.",
    msTable: "Milestones and release conditions", colMs: "Milestone", colCrit: "Acceptance criterion", colAmount: "Amount", colDue: "Due", colStatus: "Status", colDate: "Date",
    signatures: "Signatures", signedOn: "signed on {d}", notSigned: "not signed yet",
    agree: "I have read the terms and milestones and agree to them.",
    signBtn: "Sign contract", signNeedAgree: "Please confirm first that you agree.",
    signedToast: "Contract signed. The smart contract is active.",
    contractAddr: "Smart contract address", protocol: "Smart contract log",
    protocolHint: "Every step is recorded tamper-proof. Transaction IDs are simulated in this demo.",
    token: "CHF stablecoin",
    flowDeposited: "Deposited", flowLocked: "Locked in smart contract", flowPaid: "Paid to contractor", flowRefund: "Returned to client",
    depositTitle: "Deposit the budget", depositNeedSign: "Once the contract is signed, you can deposit the budget here.",
    depositText: "Transfer the amount in Swiss francs to our partner bank. The regulated exchange partner swaps it 1:1 into CHF stablecoin and locks it in the smart contract. You don't need a wallet.",
    payee: "Payee", payeeVal: "Partner bank (billDsmart escrow)", iban: "IBAN", ref: "Reference", amount: "Amount",
    inclFee: "incl. fee CHF {fee}",
    simulateDeposit: "Simulate payment",
    depositSteps: ["Payment received at partner bank", "Swapped 1:1 into CHF stablecoin", "Locked in smart contract"],
    depositDone: "Budget secured: {amount} {token} in the smart contract.",
    depositedOn: "Deposited on {d}: CHF {amount}",
    paymentsTable: "Payment schedule and open payments",
    payoutAccount: "Your payout account", payoutAccountText: "Approved amounts arrive in Swiss francs in this verified company account.",
    payoutsList: "Payments received", noPayouts: "No payouts yet.",
    refundAccount: "Your account for refunds",
    ms: { open: "Open", reported: "Marked as done", disputed: "Disputed", paid: "Paid out", resolved: "Settled by mediation" },
    due: "due {d}", criteria: "Acceptance criterion", tasks: "Tasks", addTask: "Add task", addTaskPh: "New task",
    tasksDone: "{a} of {b} done", evidence: "Evidence",
    needDeposit: "Actions become available once the budget has been deposited.",
    reportBtn: "Mark as done", approveBtn: "Approve", disputeBtn: "Dispute",
    waitApproval: "Waiting for the client's approval", waitReport: "Contractor at work",
    inDispute: "The amount stays locked until the disagreement is resolved.", toHelp: "Go to mediation",
    reportTitle: "Mark milestone {n} as done", reportNote: "Note to the client (optional)", reportPhoto: "Photos as evidence (optional)",
    reportOpenTasks: "Note: {n} tasks have not been ticked off yet.",
    reportSubmit: "Mark as done", reportedToast: "Milestone reported. The client will be notified.",
    approveTitle: "Approve milestone {n}", approveText: "On approval, the smart contract releases {amount} {token}. The exchange partner swaps them into francs and the partner bank transfers CHF {amount} to {who}.",
    approveSubmit: "Approve and pay out", approvedToast: "Approved. CHF {amount} is on its way to {who}.",
    disputeTitle: "Dispute milestone {n}", disputeText: "The amount of CHF {amount} stays locked. Describe what doesn't meet the acceptance criterion. You can then choose an independent expert together.",
    disputeReason: "What is wrong?", disputeReasonMissing: "Please briefly describe what is wrong.",
    disputeSubmit: "Dispute", disputedToast: "Disputed. The amount stays locked.",
    disputeBusy: "A mediation is already running. Please complete it first.",
    cancel: "Cancel", close: "Close", save: "Save",
    chatTitle: "Project chat", chatPh: "Write a message", send: "Send", attach: "Attach file",
    docs: "Documents", docUpload: "Upload", docAll: "All",
    docType: { plan: "Plan", invoice: "Invoice or quote", photo: "Photo", contract: "Contract", agreement: "Mediation", other: "Other" },
    uploadedBy: "{who}, {d}", comments: "Comments", commentPh: "Write a comment", commentBtn: "Comment", noComments: "No comments yet.",
    docDemo: "Sample document from the demo, no preview available.", docTooBig: "The file is too large for the demo storage. Only its name was saved.",
    docNoPreview: "No preview available.", openFile: "Open file", docType_label: "Type",
    attachedToast: "{name} uploaded.", storageFull: "The browser storage is full. Reset the demo or upload smaller files.",
    helpTitle: "Help with disagreements",
    helpIntro: "If you disagree about a milestone, the money stays locked. billDsmart puts you in touch with independent experts all over Switzerland. The parties pay for the advice.",
    helpSteps: ["Dispute", "Choose expert", "Mediation", "Upload result", "Notarisation", "Execution"],
    noDispute: "There's no open disagreement right now. If the client doesn't accept a reported milestone, they choose “Dispute” there.",
    dOpen: "Milestone {n} “{name}” was disputed on {d} by {who}:",
    dOpenNext: "Try to sort it out in the chat first. If you can't agree, propose an expert near you below.",
    dProposed: "{who} proposes {expert} ({city}) as the expert.",
    dProposedWait: "Waiting for {other} to agree.",
    accept: "Agree", proposeOther: "Propose someone else",
    dAccepted: "Both parties have chosen {expert}. billDsmart has informed the expert by email and shared the project documents. Arrange a meeting directly.",
    mediationDone: "Mediation is complete",
    dUpload: "Upload the letter with the result of the mediation, for example the notary's letter. billDsmart will then automatically email the notary asking them to certify the letter with their signature.",
    agreementFile: "Letter with the result (PDF or photo)", useSample: "Use the demo sample document",
    outcome: "Agreed result: share for the contractor", outcomeVal: "{pct}% = CHF {a} to {k}, CHF {b} back to {c}",
    notaryName: "Notary's name", notaryDefault: "Sample Notary Office, Zurich", notaryEmail: "Notary's email",
    uploadSubmit: "Upload and notify notary",
    needFile: "Please upload the letter or use the sample document.",
    needNotary: "Please enter the notary's name and a valid email address.",
    dRequested: "The letter has been uploaded. billDsmart automatically asked {notary} for certification on {d}.",
    dRequestedWait: "As soon as the certification arrives, the smart contract carries out the agreed split.",
    simulateNotary: "Simulate certification by the notary",
    dResolved: "Done: {notary} certified the result on {d}. CHF {a} went to {k}, CHF {b} back to {c}.",
    experts: "Independent experts", expertsHint: "Sample contacts, fictional. Sorted by distance to the site in Uster.",
    allCantons: "All cantons", allKinds: "All fields",
    kind: { mediation: "Mediation", arbitration: "Construction arbitration", law: "Construction law" },
    km: "{km} km", nearby: "Near you", propose: "Propose", chosen: "Chosen",
    proposedToast: "{expert} proposed. {other} will be notified.",
    acceptedToast: "Expert confirmed. The email has been sent.",
    notaryToast: "Uploaded. The email to the notary has been sent.",
    certifiedToast: "Certified. The split has been carried out.",
    outbox: "Automatic emails from billDsmart", outboxEmpty: "No emails sent yet.",
    outboxNote: "In the demo, emails are shown here instead of being sent.",
    mailTo: "To", mailSubject: "Subject", mailSent: "Sent",
    mailMediatorSubject: "New mediation request – contract {id}",
    mailMediatorBody: "Hello\n\nIn the project “{project}” (contract {id}), {client} and {contractor} have chosen you as their independent expert.\n\nThe matter concerns milestone {n} “{name}” worth CHF {amount}. Reason for the dispute: “{reason}”\n\nThe project documents (contract, photos, chat on this milestone) have been shared with you. Please contact both parties directly.\n\nKind regards\nbillDsmart",
    mailNotarySubject: "Request for certification: mediation result for contract {id}",
    mailNotaryBody: "Hello {notary}\n\nIn the project “{project}” (contract {id}), {client} and {contractor} have completed a mediation on milestone {n} “{name}”. The letter “{file}” was uploaded to billDsmart on {d}.\n\nAgreed result: {pct}% (CHF {a}) to the contractor, CHF {b} back to the client.\n\nWe kindly ask you to certify the letter with your signature, confirming that it reflects the result of the mediation. You can view the document and upload the certification via the secure link in this email.\n\nThe smart contract will only carry out the split after your certification.\n\nKind regards\nbillDsmart\ncontact@billDsmart.ch",
    premiumTitle: "All projects", premiumLead: "With Premium, general contractors and businesses with several sites run all projects in one dashboard and get extended reporting.",
    premiumPrice: "CHF 290 per month", premiumUnlock: "Open preview", premiumPreview: "Preview with sample data",
    pProject: "Project", pClient: "Client", pVolume: "Volume", pLocked: "Secured", pPaid: "Paid out", pNext: "Next milestone",
    reportingTitle: "Extended reporting", rOpen: "Total open payments", rPaidMonth: "Paid out in the last 30 days", rApproval: "Average approval time", rDays: "{n} days",
    rChart: "Payouts per month (all projects)", rExport: "Export for accounting (CSV)", planned: "planned",
    profileTitle: "Profile and verification", company: "Company", person: "Person", address: "Address",
    kycTitle: "Verification (KYC)", kycDone: "completed",
    kycSteps: { client: ["Identity confirmed (ID and selfie video)", "Bank account confirmed (test transfer)"], contractor: ["Company verified (UID and commercial register)", "Beneficial owner recorded", "Identity of authorised signatory confirmed", "Company account confirmed (test transfer)"] },
    noWallet: "You don't need a wallet. The regulated partner carries out the checks under Swiss anti-money-laundering rules.",
    ev: {
      proposed: "{who} created and signed the contract.",
      signed: "{who} signed. The smart contract is active.",
      deposit: "CHF {amount} received at the partner bank (incl. fee CHF {fee}).",
      minted: "CHF {amount} swapped 1:1 into {token}.",
      locked: "{amount} {token} locked in the smart contract.",
      reported: "Milestone {n} “{name}” marked as done.",
      approved: "Milestone {n} “{name}” approved.",
      released: "{amount} {token} released and swapped into francs.",
      payout: "CHF {amount} transferred to {to}'s account.",
      refund: "CHF {amount} transferred back to {to}.",
      disputed: "Milestone {n} disputed. CHF {amount} stays locked.",
      expertProposed: "{who} proposes {expert} as the expert.",
      expertAccepted: "Both parties have chosen {expert}.",
      mediationDone: "Mediation on milestone {n} completed.",
      agreementUploaded: "{who} uploaded the mediation result.",
      notaryEmailed: "Email to {notary}: request for certification.",
      certified: "{notary} certified the result.",
      completed: "All milestones settled. Contract completed.",
      message: "{text}",
    },
    msg1: "Hello Ms Sample. As discussed, here are the quote and the contract with five milestones. I've already signed.",
    msg2: "Thank you, Mr Example. I'm uploading the stairwell floor plan and the colour concept here.",
    msg3: "Is the colour on the façade the one from the colour concept?",
    msg4: "Yes, exactly the colour from the concept. The façade is finished, photos are on the milestone.",
    cm1: "Please also paint the cellar door in the stairwell.", cm2: "Will do, it's included in the price.",
    reasonSample: "On the north side there are colour differences and runs in the paint.",
    you: "You",
  },
};

/* ==========================================================
   Hilfsfunktionen
   ========================================================== */
let lang = "de";
let state = null;
let session = null;
let view = "overview";
let ui = { canton: "", kind: "", docFilter: "", deposit: 0 };

const t = () => T[lang];
const fill = (str, vars = {}) => String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
const num = (n) => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-CH", { maximumFractionDigits: 0 }).format(Math.round(n));
const chf = (n) => "CHF " + num(n);
const locale = () => (lang === "de" ? "de-CH" : "en-GB");
const fmtDate = (ts) => new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(ts));
const fmtDT = (ts) => new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const loc = (v) => (v && typeof v === "object" ? v[lang] || v.de : v);
const dn = (d) => loc(d.name);   // Dokumentname in der gewählten Sprache
const dd = (d) => loc(d.data);   // Dateiinhalt (Beispielbilder gibt es in beiden Sprachen)
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const txId = () => "0x" + hex(64);
const short = (h) => h.slice(0, 8) + "…" + h.slice(-6);
const nextId = (p) => p + (++state.seq);
const partyName = (role) => (role === "contractor" ? PEOPLE.contractor.org : PEOPLE.client.name);
const msIndex = (id) => state.milestones.findIndex((m) => m.id === id);
const msById = (id) => state.milestones.find((m) => m.id === id);

function distanceKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ---------- Beispielbilder als SVG (keine externen Dateien nötig) ---------- */
const svgData = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
const imgColors = (l) => svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect width="400" height="260" fill="#fff"/><text x="20" y="34" font-family="Arial" font-size="18" font-weight="700" fill="#1C3258">${l === "de" ? "Farbkonzept Musterweg 5" : "Colour concept Sample Street 5"}</text><rect x="20" y="60" width="110" height="120" fill="#EFE6D2"/><rect x="145" y="60" width="110" height="120" fill="#8B5A3C"/><rect x="270" y="60" width="110" height="120" fill="#F7F4EE" stroke="#ccc"/><g font-family="Arial" font-size="12" fill="#1C3258"><text x="20" y="200">${l === "de" ? "Fassade" : "Façade"}</text><text x="20" y="216">NCS S 1005-Y20R</text><text x="145" y="200">${l === "de" ? "Fensterläden" : "Shutters"}</text><text x="145" y="216">NCS S 6030-Y60R</text><text x="270" y="200">${l === "de" ? "Treppenhaus" : "Stairwell"}</text><text x="270" y="216">NCS S 0502-Y</text></g></svg>`);
const imgFacade = (l) => svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#CFE0F1"/><rect y="230" width="400" height="70" fill="#9DB27A"/><polygon points="60,110 200,40 340,110" fill="#8B3A2B"/><rect x="70" y="110" width="260" height="140" fill="#EFE6D2"/><g fill="#5C7D9A" stroke="#8B5A3C" stroke-width="5"><rect x="95" y="130" width="40" height="45"/><rect x="180" y="130" width="40" height="45"/><rect x="265" y="130" width="40" height="45"/><rect x="95" y="190" width="40" height="45"/><rect x="265" y="190" width="40" height="45"/></g><rect x="180" y="190" width="40" height="60" fill="#6B4A33"/><text x="12" y="290" font-family="Arial" font-size="13" fill="#fff">${l === "de" ? "Fassade Süd, nach 2. Anstrich" : "South façade, after second coat"}</text></svg>`);
const imgScaffold = (l) => svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#D9E4EE"/><rect x="70" y="80" width="260" height="190" fill="#E3DCCB"/><g stroke="#56627A" stroke-width="4"><line x1="60" y1="70" x2="60" y2="280"/><line x1="130" y1="70" x2="130" y2="280"/><line x1="200" y1="70" x2="200" y2="280"/><line x1="270" y1="70" x2="270" y2="280"/><line x1="340" y1="70" x2="340" y2="280"/><line x1="50" y1="140" x2="350" y2="140"/><line x1="50" y1="210" x2="350" y2="210"/></g><rect x="100" y="150" width="40" height="40" fill="#fff" stroke="#D4642D" stroke-width="3"/><rect x="250" y="150" width="40" height="40" fill="#fff" stroke="#D4642D" stroke-width="3"/><text x="12" y="290" font-family="Arial" font-size="13" fill="#1C3258">${l === "de" ? "Gerüst gestellt, Fenster abgedeckt" : "Scaffolding up, windows masked"}</text></svg>`);
const both = (fn) => ({ de: fn("de"), en: fn("en") });

/* ==========================================================
   Daten: Szenarien
   ========================================================== */
function log(key, p = {}, ts = Date.now()) {
  state.ledger.push({ id: nextId("l"), ts, key, p, tx: txId() });
}
function sys(key, p = {}, ts = Date.now()) {
  state.messages.push({ id: nextId("c"), from: "system", key, p, ts });
}

function buildState(scenario) {
  const now = Date.now();
  state = {
    version: 1, scenario, seq: 100,
    contract: {
      id: "BDS-2026-0147",
      address: "0x7a3f91c4e2b8d05a6f1e9c3b7d2a48e0f5c6c21e",
      title: { de: "Malerarbeiten Musterweg 5, Uster", en: "Painting works Sample Street 5, Uster" },
      status: "proposed", signedContractorAt: now - 2 * DAY, signedClientAt: null, feeShareClient: 100,
    },
    deposit: null,
    milestones: MS_SEED.map((m) => ({
      id: m.id, name: m.name, criteria: m.criteria, amount: m.amount, due: now + m.dueDays * DAY,
      status: "open", reportedAt: null, paidAt: null, note: "", evidence: [], resolution: null,
      tasks: m.tasks.map((text, j) => ({ id: `${m.id}t${j}`, text, done: false })),
    })),
    docs: [
      { id: "d1", name: { de: "Offerte_Malerarbeiten_Musterweg5.pdf", en: "Quote_painting_works_SampleStreet5.pdf" }, type: "invoice", size: 184000, by: "contractor", ts: now - 2 * DAY - 3600000, data: null, comments: [] },
      { id: "d2", name: { de: "Vertrag_BDS-2026-0147.pdf", en: "Contract_BDS-2026-0147.pdf" }, type: "contract", size: 96000, by: "contractor", ts: now - 2 * DAY - 3500000, data: null, comments: [] },
      { id: "d3", name: { de: "Grundriss_Treppenhaus.pdf", en: "Floor_plan_stairwell.pdf" }, type: "plan", size: 412000, by: "client", ts: now - 1 * DAY, data: null, comments: [
        { by: "client", key: "cm1", ts: now - 1 * DAY + 600000 }, { by: "contractor", key: "cm2", ts: now - 1 * DAY + 4000000 }] },
      { id: "d4", name: { de: "Farbkonzept.svg", en: "Colour_concept.svg" }, type: "photo", size: 2400, by: "client", ts: now - 1 * DAY + 60000, data: both(imgColors), comments: [] },
    ],
    messages: [],
    ledger: [],
    dispute: null,
    outbox: [],
    premiumPreview: false,
  };
  state.messages.push({ id: "c1", from: "contractor", key: "msg1", ts: now - 2 * DAY - 3400000, docs: ["d1", "d2"] });
  state.messages.push({ id: "c2", from: "client", key: "msg2", ts: now - 1 * DAY + 120000, docs: ["d3", "d4"] });
  log("proposed", { who: "contractor" }, now - 2 * DAY);

  if (scenario === "running") {
    const c = state.contract;
    c.status = "active"; c.signedClientAt = now - 20 * DAY; c.signedContractorAt = now - 21 * DAY;
    state.ledger[0].ts = now - 21 * DAY;
    state.messages[0].ts = now - 21 * DAY; state.messages[1].ts = now - 20 * DAY - 7200000;
    state.docs.forEach((d, i) => { d.ts = now - (21 - i * 0.3) * DAY; });
    log("signed", { who: "client" }, now - 20 * DAY);
    const fee = TOTAL * FEE_RATE;
    state.deposit = { ts: now - 19 * DAY, amount: TOTAL, fee };
    log("deposit", { amount: TOTAL + fee, fee }, now - 19 * DAY);
    log("minted", { amount: TOTAL }, now - 19 * DAY + 60000);
    log("locked", { amount: TOTAL }, now - 19 * DAY + 120000);
    // Meilenstein 1 ausbezahlt
    const m1 = state.milestones[0];
    m1.tasks.forEach((x) => (x.done = true));
    state.docs.push({ id: "d5", name: { de: "Geruest_und_Abdeckung.svg", en: "Scaffolding_and_masking.svg" }, type: "photo", size: 2600, by: "contractor", ts: now - 14 * DAY, data: both(imgScaffold), comments: [] });
    m1.evidence = ["d5"]; m1.status = "paid"; m1.reportedAt = now - 14 * DAY; m1.paidAt = now - 13 * DAY;
    log("reported", { n: 1, ms: "m1" }, now - 14 * DAY);
    log("approved", { n: 1, ms: "m1" }, now - 13 * DAY);
    log("released", { amount: m1.amount }, now - 13 * DAY + 60000);
    log("payout", { amount: m1.amount, to: "contractor" }, now - 13 * DAY + 120000);
    // Meilenstein 2 gemeldet
    const m2 = state.milestones[1];
    m2.tasks.forEach((x) => (x.done = true));
    state.messages.push({ id: "c3", from: "client", key: "msg3", ts: now - 6 * DAY });
    state.docs.push({ id: "d6", name: { de: "Fassade_Sued_fertig.svg", en: "South_facade_done.svg" }, type: "photo", size: 2800, by: "contractor", ts: now - 1 * DAY, data: both(imgFacade), comments: [] });
    m2.evidence = ["d6"]; m2.status = "reported"; m2.reportedAt = now - 1 * DAY;
    state.messages.push({ id: "c4", from: "contractor", key: "msg4", ts: now - 1 * DAY + 60000, docs: ["d6"] });
    log("reported", { n: 2, ms: "m2" }, now - 1 * DAY);
    state.milestones[2].tasks[0].done = true;
  }
  save();
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { state = JSON.parse(raw); return; }
  } catch (e) { /* ignorieren */ }
  buildState("start");
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch (e) { toast(t().storageFull); return false; }
}

/* ---------- Kennzahlen ---------- */
function money() {
  let paid = 0, refunded = 0;
  state.ledger.forEach((l) => {
    if (l.key === "payout") paid += l.p.amount;
    if (l.key === "refund") refunded += l.p.amount;
  });
  const locked = state.deposit ? TOTAL - paid - refunded : 0;
  return { paid, refunded, locked, open: TOTAL - paid - refunded, deposited: state.deposit ? state.deposit.amount + state.deposit.fee : 0 };
}
const doneCount = () => state.milestones.filter((m) => m.status === "paid").length;

/* ==========================================================
   Aktionen (verändern den Zustand)
   ========================================================== */
const Actions = {
  sign() {
    const c = state.contract;
    c.signedClientAt = Date.now(); c.status = "active";
    log("signed", { who: "client" });
    sys("signed", { who: "client" });
  },
  deposit() {
    const fee = TOTAL * FEE_RATE;
    state.deposit = { ts: Date.now(), amount: TOTAL, fee };
    log("deposit", { amount: TOTAL + fee, fee });
    log("minted", { amount: TOTAL });
    log("locked", { amount: TOTAL });
    sys("locked", { amount: TOTAL });
  },
  report(id, note, docIds) {
    const m = msById(id), n = msIndex(id) + 1;
    m.status = "reported"; m.reportedAt = Date.now(); m.note = note || "";
    m.evidence = m.evidence.concat(docIds);
    log("reported", { n, ms: id });
    if (note || docIds.length) state.messages.push({ id: nextId("c"), from: "contractor", text: note, ts: Date.now(), docs: docIds });
    sys("reported", { n, ms: id });
  },
  approve(id) {
    const m = msById(id), n = msIndex(id) + 1;
    m.status = "paid"; m.paidAt = Date.now();
    log("approved", { n, ms: id });
    log("released", { amount: m.amount });
    log("payout", { amount: m.amount, to: "contractor" });
    sys("payout", { amount: m.amount, to: "contractor" });
    Actions.checkComplete();
  },
  dispute(id, reason) {
    const m = msById(id), n = msIndex(id) + 1;
    m.status = "disputed";
    state.dispute = { ms: id, reason, by: "client", openedAt: Date.now(), stage: "open", expert: null, proposedBy: null, notary: null, doc: null, pct: 80 };
    log("disputed", { n, amount: m.amount });
    state.messages.push({ id: nextId("c"), from: "client", text: reason, ts: Date.now() });
    sys("disputed", { n, amount: m.amount });
  },
  propose(expertId, role) {
    const d = state.dispute;
    d.expert = expertId; d.proposedBy = role; d.stage = "proposed";
    const ex = EXPERTS.find((e) => e.id === expertId);
    log("expertProposed", { who: role, expert: ex.id });
    sys("expertProposed", { who: role, expert: ex.id });
  },
  acceptExpert() {
    const d = state.dispute, ex = EXPERTS.find((e) => e.id === d.expert);
    const m = msById(d.ms);
    d.stage = "accepted"; d.acceptedAt = Date.now();
    log("expertAccepted", { expert: ex.id });
    sys("expertAccepted", { expert: ex.id });
    state.outbox.push({ id: nextId("o"), ts: Date.now(), kind: "mediator", to: ex.id, toEmail: `kontakt-${ex.id}@example.com`,
      p: { id: state.contract.id, n: msIndex(d.ms) + 1, ms: d.ms, amount: num(m.amount), reason: d.reason } });
  },
  reproposeExpert() { const d = state.dispute; d.stage = "open"; d.expert = null; d.proposedBy = null; },
  mediationDone() {
    const d = state.dispute; d.stage = "mediation_done";
    log("mediationDone", { n: msIndex(d.ms) + 1 });
  },
  uploadAgreement(role, docId, pct, notary, notaryEmail) {
    const d = state.dispute;
    d.stage = "notary_requested"; d.doc = docId; d.pct = pct; d.notary = notary; d.notaryEmail = notaryEmail; d.requestedAt = Date.now();
    log("agreementUploaded", { who: role });
    log("notaryEmailed", { notary });
    sys("notaryEmailed", { notary });
    const m = msById(d.ms), doc = state.docs.find((x) => x.id === docId);
    const a = m.amount * pct / 100;
    state.outbox.push({ id: nextId("o"), ts: Date.now(), kind: "notary", to: notary, toEmail: notaryEmail,
      p: { id: state.contract.id, n: msIndex(d.ms) + 1, ms: d.ms, file: doc ? doc.id : "", d: Date.now(), pct, a: num(a), b: num(m.amount - a), notary } });
  },
  certify() {
    const d = state.dispute, m = msById(d.ms);
    const a = Math.round(m.amount * d.pct / 100), b = m.amount - a;
    d.stage = "resolved"; d.resolvedAt = Date.now();
    log("certified", { notary: d.notary });
    if (a > 0) { log("released", { amount: a }); log("payout", { amount: a, to: "contractor" }); }
    if (b > 0) { log("refund", { amount: b, to: "client" }); }
    m.status = "paid"; m.paidAt = Date.now(); m.resolution = { pct: d.pct, a, b };
    sys("certified", { notary: d.notary });
    Actions.checkComplete();
  },
  checkComplete() {
    if (state.milestones.every((m) => m.status === "paid") && state.contract.status !== "completed") {
      state.contract.status = "completed";
      log("completed"); sys("completed");
    }
  },
};

/* ==========================================================
   Darstellung
   ========================================================== */
const $ = (sel) => document.querySelector(sel);

function evText(e) {
  const x = t();
  const p = { ...e.p, token: x.token };
  if (p.amount !== undefined) p.amount = num(p.amount);
  if (p.fee !== undefined) p.fee = num(p.fee);
  if (p.who) p.who = partyName(p.who);
  if (p.to) p.to = partyName(p.to);
  if (p.ms) p.name = loc(msById(p.ms).name);
  if (p.expert) p.expert = expertName(p.expert);
  return fill(x.ev[e.key] || e.key, p);
}

function statusBadge(m) {
  const x = t();
  const key = m.status === "paid" && m.resolution ? "resolved" : m.status;
  return `<span class="badge badge-${key}">${x.ms[key]}</span>`;
}

function nextAction() {
  const x = t(), role = session.role, c = state.contract;
  const o = partyName(other(role));
  const d = state.dispute;
  if (c.status === "completed") return { k: x.next.done };
  if (d && d.stage !== "resolved") {
    const n = msIndex(d.ms) + 1;
    const myTurn = (d.stage === "proposed" && d.proposedBy !== role) || d.stage === "open" || d.stage === "accepted" || d.stage === "mediation_done";
    return { k: myTurn ? x.next.dispute : x.next.disputeWait, v: { n }, go: "help" };
  }
  if (role === "client") {
    if (c.status === "proposed") return { k: x.next.c_sign, v: { other: o }, go: "contract" };
    if (!state.deposit) return { k: x.next.c_deposit, v: { amount: num(TOTAL * (1 + FEE_RATE)) }, go: "payments" };
    const r = state.milestones.find((m) => m.status === "reported");
    if (r) return { k: x.next.c_review, v: { n: msIndex(r.id) + 1, name: loc(r.name) }, go: "milestones" };
    return { k: x.next.idle };
  }
  if (c.status === "proposed") return { k: x.next.k_waitsign, v: { other: o }, go: "contract" };
  if (!state.deposit) return { k: x.next.k_waitdeposit, go: "payments" };
  const r = state.milestones.find((m) => m.status === "reported");
  const open = state.milestones.find((m) => m.status === "open");
  if (open) return { k: x.next.k_report, v: { n: msIndex(open.id) + 1, name: loc(open.name) }, go: "milestones" };
  if (r) return { k: x.next.k_waitreview, v: { name: loc(r.name), other: o }, go: "milestones" };
  return { k: x.next.idle };
}

function navBadges() {
  const role = session.role, b = {};
  const na = nextAction();
  if (na.go && na.k !== t().next.k_waitsign && na.k !== t().next.k_waitdeposit && na.k !== t().next.k_waitreview && na.k !== t().next.disputeWait) b[na.go] = 1;
  if (state.dispute && state.dispute.stage !== "resolved") b.help = 1;
  return b;
}

function renderChrome() {
  const x = t(), role = session.role, me = PEOPLE[role];
  document.documentElement.lang = lang;
  document.title = x.title;
  document.querySelector(".skip-link").textContent = x.skip;
  $("#logout-btn").textContent = x.logout;
  document.querySelectorAll("[data-set-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)));
  $("#demo-bar").innerHTML = `
    <p>${x.demoInfo}</p>
    <div class="demo-bar-actions">
      <button type="button" data-action="scenario" data-s="start" aria-pressed="${state.scenario === "start"}">${x.scenStart}</button>
      <button type="button" data-action="scenario" data-s="running" aria-pressed="${state.scenario === "running"}">${x.scenRunning}</button>
      <button type="button" data-action="switch-role">${x.switchRole}</button>
    </div>`;
  $("#app-project").innerHTML = `<strong>${esc(loc(state.contract.title))}</strong><span>${esc(state.contract.id)} <span class="badge badge-c-${state.contract.status}">${x.status[state.contract.status]}</span></span>`;
  $("#user-chip").innerHTML = `<span class="avatar avatar-${role}" aria-hidden="true">${me.initials}</span><span class="user-chip-text"><strong>${esc(me.name)}</strong><small>${x["role" + role]}</small></span>`;

  const items = ["overview", "contract", "payments", "milestones", "chat", "help"];
  if (role === "contractor") items.push("premium");
  items.push("profile");
  const badges = navBadges();
  $("#app-nav").innerHTML = `<ul>${items.map((v) => `
    <li><button type="button" data-action="nav" data-view="${v}" ${v === view ? 'aria-current="page"' : ""}>
      <span>${x.nav[v]}</span>${v === "premium" ? `<span class="tag-premium">${x.premiumTag}</span>` : ""}${badges[v] ? '<span class="dot" aria-hidden="true"></span>' : ""}
    </button></li>`).join("")}</ul>`;
}

function render() {
  renderChrome();
  const main = $("#app-main");
  const views = { overview: vOverview, contract: vContract, payments: vPayments, milestones: vMilestones, chat: vChat, help: vHelp, premium: vPremium, profile: vProfile };
  if (view === "premium" && session.role !== "contractor") view = "overview";
  main.innerHTML = views[view]();
  if (view === "chat") { const th = $("#chat-thread"); if (th) th.scrollTop = th.scrollHeight; }
}

/* ---------- Übersicht ---------- */
function vOverview() {
  const x = t(), role = session.role, me = PEOPLE[role], o = other(role), op = PEOPLE[o];
  const na = nextAction(), m = money();
  const recent = state.ledger.slice(-6).reverse();
  return `
  <div class="page-head">
    <h1>${fill(x.hello, { name: esc(me.first) })}</h1>
    <p>${fill(x.yourRole, { role: x["role" + role] })}</p>
  </div>
  <section class="card card-next">
    <p class="card-kicker">${x.nextStep}</p>
    <h2>${fill(na.k[0], na.v)}</h2>
    <p>${fill(na.k[1], na.v)}</p>
    ${na.go ? `<button type="button" class="btn btn-primary" data-action="nav" data-view="${na.go}">${x.go}: ${x.nav[na.go]}</button>` : ""}
  </section>
  <div class="kpis">
    <div class="kpi"><span>${x.kpiLocked}</span><strong>${chf(m.locked)}</strong><small>${num(m.locked)} ${x.token}</small></div>
    <div class="kpi"><span>${x.kpiPaid}</span><strong class="kpi-paid">${chf(m.paid)}</strong></div>
    <div class="kpi"><span>${x.kpiOpen}</span><strong>${chf(m.open)}</strong></div>
    <div class="kpi"><span>${x.kpiProgress}</span><strong>${fill(x.kpiProgressVal, { a: doneCount(), b: state.milestones.length })}</strong></div>
  </div>
  ${msBar()}
  <div class="grid-2">
    <section class="card">
      <h2 class="card-title">${x.otherParty}</h2>
      ${partyCard(o)}
      <button type="button" class="btn btn-secondary btn-small" data-action="nav" data-view="chat">${x.writeMsg}</button>
    </section>
    <section class="card">
      <h2 class="card-title">${x.activity}</h2>
      <ul class="activity">${recent.map((e) => `<li><time>${fmtDT(e.ts)}</time><span>${esc(evText(e))}</span></li>`).join("")}</ul>
      <button type="button" class="link-btn" data-action="nav" data-view="contract">${x.allActivity}</button>
    </section>
  </div>`;
}

function msBar() {
  const x = t();
  return `<div class="ms-bar" aria-hidden="true">${state.milestones.map((m, i) => {
    const key = m.status === "paid" ? "paid" : m.status;
    const cls = state.deposit ? key : "nodeposit";
    return `<div class="ms-seg ms-seg-${cls}" style="flex-grow:${m.amount}"><span>${i + 1}</span></div>`;
  }).join("")}</div>
  <ul class="legend legend-app" aria-hidden="true">
    <li><i class="swatch swatch-held"></i>${x.ms.open}</li><li><i class="swatch swatch-reported"></i>${x.ms.reported}</li>
    <li><i class="swatch swatch-disputed"></i>${x.ms.disputed}</li><li><i class="swatch swatch-paid"></i>${x.ms.paid}</li>
  </ul>`;
}

function partyCard(role) {
  const x = t(), p = PEOPLE[role];
  const checks = role === "contractor" ? [fill(x.kycCompany, { uid: p.uid }), x.kycId, x.kycBank] : [x.kycId, x.kycBank];
  return `<div class="party">
    <span class="avatar avatar-lg avatar-${role}" aria-hidden="true">${p.initials}</span>
    <div>
      <p class="party-role">${role === "client" ? x.client : x.contractor}</p>
      <p class="party-name">${esc(p.org || p.name)}</p>
      ${p.org ? `<p class="party-sub">${esc(p.name)}</p>` : ""}
      <p class="party-sub">${esc(p.address)}</p>
      <ul class="checks">${checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>
  </div>`;
}

/* ---------- Smart Contract ---------- */
function vContract() {
  const x = t(), c = state.contract, role = session.role;
  const fee = TOTAL * FEE_RATE;
  const canSign = role === "client" && c.status === "proposed";
  return `
  <div class="page-head">
    <h1>${fill(x.contractTitle, { id: c.id })}</h1>
    <p>${esc(loc(c.title))} <span class="badge badge-c-${c.status}">${x.status[c.status]}</span></p>
  </div>
  <section class="card">
    <h2 class="card-title">${x.parties}</h2>
    <div class="grid-2 grid-tight">${partyCard("client")}${partyCard("contractor")}</div>
  </section>
  <section class="card">
    <h2 class="card-title">${x.terms}</h2>
    <dl class="terms">
      <div><dt>${x.total}</dt><dd><strong>${chf(TOTAL)}</strong></dd></div>
      <div><dt>${x.fee}</dt><dd>${chf(fee)}, ${fill(x.feePaidBy, { who: x.client })}</dd></div>
      <div><dt>${x.currency}</dt><dd>${x.currencyVal}</dd></div>
      <div><dt>${x.disputeRule}</dt><dd>${x.disputeRuleVal}</dd></div>
      <div><dt>${x.contractAddr}</dt><dd><code>${short(c.address)}</code></dd></div>
    </dl>
  </section>
  <section class="card">
    <h2 class="card-title">${x.msTable}</h2>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>#</th><th>${x.colMs}</th><th>${x.colCrit}</th><th class="num">${x.colAmount}</th><th>${x.colDue}</th><th>${x.colStatus}</th></tr></thead>
      <tbody>${state.milestones.map((m, i) => `<tr><td>${i + 1}</td><td><strong>${esc(loc(m.name))}</strong></td><td>${esc(loc(m.criteria))}</td><td class="num">${chf(m.amount)}</td><td>${fmtDate(m.due)}</td><td>${statusBadge(m)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td></td><td colspan="2"><strong>${x.total}</strong></td><td class="num"><strong>${chf(TOTAL)}</strong></td><td colspan="2"></td></tr></tfoot>
    </table></div>
  </section>
  <section class="card">
    <h2 class="card-title">${x.signatures}</h2>
    <ul class="signatures">
      <li><span class="avatar avatar-contractor" aria-hidden="true">${PEOPLE.contractor.initials}</span><span><strong>${esc(PEOPLE.contractor.org)}</strong> ${fill(x.signedOn, { d: fmtDate(c.signedContractorAt) })}</span></li>
      <li><span class="avatar avatar-client" aria-hidden="true">${PEOPLE.client.initials}</span><span><strong>${esc(PEOPLE.client.name)}</strong> ${c.signedClientAt ? fill(x.signedOn, { d: fmtDate(c.signedClientAt) }) : x.notSigned}</span></li>
    </ul>
    ${canSign ? `<form class="sign-form" data-form="sign">
      <label class="check"><input type="checkbox" name="agree"> <span>${x.agree}</span></label>
      <p class="field-error" id="sign-error"></p>
      <button type="submit" class="btn btn-primary">${x.signBtn}</button>
    </form>` : ""}
  </section>
  <section class="card">
    <h2 class="card-title">${x.protocol}</h2>
    <p class="muted small">${x.protocolHint}</p>
    <ol class="ledger">${state.ledger.slice().reverse().map((e) => `<li><time>${fmtDT(e.ts)}</time><span>${esc(evText(e))}</span><code title="${e.tx}">${short(e.tx)}</code></li>`).join("")}</ol>
  </section>`;
}

/* ---------- Zahlungen ---------- */
function vPayments() {
  const x = t(), role = session.role, m = money(), c = state.contract;
  const fee = TOTAL * FEE_RATE;
  let depositBlock = "";
  if (role === "client") {
    if (c.status === "proposed") depositBlock = `<section class="card card-muted"><h2 class="card-title">${x.depositTitle}</h2><p>${x.depositNeedSign}</p><button type="button" class="btn btn-secondary btn-small" data-action="nav" data-view="contract">${x.nav.contract}</button></section>`;
    else if (!state.deposit) depositBlock = `
      <section class="card card-next">
        <h2>${x.depositTitle}</h2>
        <p>${x.depositText}</p>
        <dl class="payslip">
          <div><dt>${x.payee}</dt><dd>${x.payeeVal}</dd></div>
          <div><dt>${x.iban}</dt><dd><code>CH00 0000 0000 0000 0000 9</code></dd></div>
          <div><dt>${x.ref}</dt><dd><code>${c.id}</code></dd></div>
          <div><dt>${x.amount}</dt><dd><strong>${chf(TOTAL + fee)}</strong> <small>${fill(x.inclFee, { fee: num(fee) })}</small></dd></div>
        </dl>
        <ol class="deposit-steps" id="deposit-steps">${x.depositSteps.map((s, i) => `<li class="${ui.deposit > i ? "done" : ""}">${s}</li>`).join("")}</ol>
        <button type="button" class="btn btn-primary" data-action="simulate-deposit" ${ui.deposit ? "disabled" : ""}>${x.simulateDeposit}</button>
      </section>`;
    else depositBlock = `<p class="note-ok">${fill(x.depositedOn, { d: fmtDate(state.deposit.ts), amount: num(state.deposit.amount + state.deposit.fee) })}</p>`;
  }
  const payouts = state.ledger.filter((l) => l.key === "payout" || l.key === "refund");
  const accountBlock = role === "contractor" ? `
    <section class="card">
      <h2 class="card-title">${x.payoutAccount}</h2>
      <p>${x.payoutAccountText}</p>
      <p class="iban"><code>${PEOPLE.contractor.iban}</code> <span class="muted">${esc(PEOPLE.contractor.org)}</span></p>
      <h3 class="sub-title">${x.payoutsList}</h3>
      ${payouts.filter((p) => p.key === "payout").length ? `<ul class="activity">${payouts.filter((p) => p.key === "payout").reverse().map((p) => `<li><time>${fmtDT(p.ts)}</time><span><strong>${chf(p.p.amount)}</strong></span></li>`).join("")}</ul>` : `<p class="muted">${x.noPayouts}</p>`}
    </section>` : (state.deposit ? `
    <section class="card">
      <h2 class="card-title">${x.refundAccount}</h2>
      <p class="iban"><code>${PEOPLE.client.iban}</code> <span class="muted">${esc(PEOPLE.client.name)}</span></p>
    </section>` : "");
  return `
  <div class="page-head"><h1>${x.nav.payments}</h1></div>
  <ol class="money-flow">
    <li><span>${x.flowDeposited}</span><strong>${chf(m.deposited)}</strong><small>CHF</small></li>
    <li class="mf-key"><span>${x.flowLocked}</span><strong>${num(m.locked)}</strong><small>${x.token}</small></li>
    <li><span>${x.flowPaid}</span><strong>${chf(m.paid)}</strong><small>CHF</small></li>
    <li><span>${x.flowRefund}</span><strong>${chf(m.refunded)}</strong><small>CHF</small></li>
  </ol>
  ${depositBlock}
  <section class="card">
    <h2 class="card-title">${x.paymentsTable}</h2>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>#</th><th>${x.colMs}</th><th class="num">${x.colAmount}</th><th>${x.colDue}</th><th>${x.colStatus}</th><th>${x.colDate}</th></tr></thead>
      <tbody>${state.milestones.map((ms, i) => `<tr><td>${i + 1}</td><td>${esc(loc(ms.name))}</td><td class="num">${chf(ms.amount)}${ms.resolution ? `<br><small>${chf(ms.resolution.a)} / ${chf(ms.resolution.b)}</small>` : ""}</td><td>${fmtDate(ms.due)}</td><td>${statusBadge(ms)}</td><td>${ms.paidAt ? fmtDate(ms.paidAt) : "–"}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td></td><td><strong>${x.kpiOpen}</strong></td><td class="num"><strong>${chf(m.open)}</strong></td><td colspan="3"></td></tr></tfoot>
    </table></div>
  </section>
  ${accountBlock}`;
}

/* ---------- Meilensteine und Aufgaben ---------- */
function vMilestones() {
  const x = t(), role = session.role;
  const active = state.contract.status !== "proposed" && !!state.deposit;
  return `
  <div class="page-head"><h1>${x.nav.milestones}</h1>${active ? "" : `<p class="note-warn">${x.needDeposit}</p>`}</div>
  ${msBar()}
  <ol class="ms-list">${state.milestones.map((m, i) => {
    const done = m.tasks.filter((k) => k.done).length;
    let actions = "";
    if (active) {
      if (m.status === "open") actions = role === "contractor" ? `<button type="button" class="btn btn-primary btn-small" data-action="report" data-ms="${m.id}">${x.reportBtn}</button>` : `<span class="muted small">${x.waitReport}</span>`;
      if (m.status === "reported") actions = role === "client" ? `<button type="button" class="btn btn-primary btn-small" data-action="approve" data-ms="${m.id}">${x.approveBtn}</button><button type="button" class="btn btn-danger btn-small" data-action="dispute" data-ms="${m.id}">${x.disputeBtn}</button>` : `<span class="muted small">${x.waitApproval}</span>`;
      if (m.status === "disputed") actions = `<span class="small warn-text">${x.inDispute}</span><button type="button" class="btn btn-secondary btn-small" data-action="nav" data-view="help">${x.toHelp}</button>`;
    }
    const ev = m.evidence.map((id) => state.docs.find((d) => d.id === id)).filter(Boolean);
    return `<li class="ms-card ms-card-${m.status}">
      <header class="ms-head">
        <span class="ms-num">${m.status === "paid" ? "✓" : i + 1}</span>
        <div class="ms-title"><h2>${esc(loc(m.name))}</h2><p>${chf(m.amount)} <span class="muted">${fill(x.due, { d: fmtDate(m.due) })}</span></p></div>
        ${statusBadge(m)}
      </header>
      <p class="ms-crit"><strong>${x.criteria}:</strong> ${esc(loc(m.criteria))}</p>
      <div class="ms-body">
        <div class="ms-tasks">
          <h3 class="sub-title">${x.tasks} <span class="muted">${fill(x.tasksDone, { a: done, b: m.tasks.length })}</span></h3>
          <ul class="tasks">${m.tasks.map((k) => `<li><label class="check ${k.done ? "is-done" : ""}"><input type="checkbox" data-action="task-toggle" data-ms="${m.id}" data-task="${k.id}" ${k.done ? "checked" : ""} ${m.status === "paid" ? "disabled" : ""}> <span>${esc(loc(k.text))}</span></label></li>`).join("")}</ul>
          ${m.status !== "paid" ? `<form class="task-add" data-form="task-add" data-ms="${m.id}"><label class="visually-hidden" for="ta-${m.id}">${x.addTask}</label><input id="ta-${m.id}" name="text" placeholder="${x.addTaskPh}" maxlength="120"><button type="submit" class="btn btn-secondary btn-small">${x.addTask}</button></form>` : ""}
        </div>
        ${ev.length ? `<div class="ms-evidence"><h3 class="sub-title">${x.evidence}</h3><div class="thumbs">${ev.map(thumb).join("")}</div></div>` : ""}
      </div>
      ${m.resolution ? `<p class="note-ok">${fill(x.outcomeVal, { pct: m.resolution.pct, a: num(m.resolution.a), b: num(m.resolution.b), k: PEOPLE.contractor.org, c: PEOPLE.client.name })}</p>` : ""}
      ${actions ? `<div class="ms-actions">${actions}</div>` : ""}
    </li>`;
  }).join("")}</ol>`;
}

function thumb(d) {
  const isImg = dd(d) && dd(d).startsWith("data:image");
  return `<button type="button" class="thumb" data-action="doc-open" data-doc="${d.id}" title="${esc(dn(d))}">
    ${isImg ? `<img src="${dd(d)}" alt="">` : `<span class="thumb-icon">${docIcon(d.type)}</span>`}
    <span class="thumb-name">${esc(dn(d))}</span></button>`;
}
function docIcon(type) {
  return { plan: "▦", invoice: "CHF", photo: "▣", contract: "§", agreement: "✎", other: "•" }[type] || "•";
}

/* ---------- Chat und Dokumente ---------- */
function vChat() {
  const x = t(), role = session.role;
  const docs = state.docs.filter((d) => !ui.docFilter || d.type === ui.docFilter).slice().reverse();
  const types = ["plan", "invoice", "photo", "contract", "agreement", "other"].filter((ty) => state.docs.some((d) => d.type === ty));
  return `
  <div class="page-head"><h1>${x.nav.chat}</h1></div>
  <div class="chat-layout">
    <section class="card chat-card">
      <h2 class="card-title">${x.chatTitle}</h2>
      <ol class="chat-thread" id="chat-thread">${state.messages.map((msg) => {
        if (msg.from === "system") return `<li class="msg msg-system"><span>${esc(evText(msg))}</span><time>${fmtDT(msg.ts)}</time></li>`;
        const mine = msg.from === role, p = PEOPLE[msg.from];
        const text = msg.key ? t()[msg.key] : msg.text;
        const atts = (msg.docs || []).map((id) => state.docs.find((d) => d.id === id)).filter(Boolean);
        return `<li class="msg ${mine ? "msg-me" : ""}">
          <span class="avatar avatar-${msg.from}" aria-hidden="true">${p.initials}</span>
          <div class="msg-bubble">
            <p class="msg-meta"><strong>${mine ? x.you : esc(p.org || p.name)}</strong> <time>${fmtDT(msg.ts)}</time></p>
            ${text ? `<p>${esc(text)}</p>` : ""}
            ${atts.length ? `<div class="msg-atts">${atts.map((d) => `<button type="button" class="att" data-action="doc-open" data-doc="${d.id}"><span class="att-icon">${docIcon(d.type)}</span>${esc(dn(d))}</button>`).join("")}</div>` : ""}
          </div>
        </li>`;
      }).join("")}</ol>
      <form class="chat-form" data-form="chat">
        <label class="visually-hidden" for="chat-input">${x.chatPh}</label>
        <textarea id="chat-input" name="text" rows="2" placeholder="${x.chatPh}" maxlength="2000"></textarea>
        <div class="chat-form-actions">
          <label class="btn btn-secondary btn-small file-btn">${x.attach}<input type="file" id="chat-file" data-upload="chat" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.dwg"></label>
          <span class="chat-pending" id="chat-pending"></span>
          <button type="submit" class="btn btn-primary btn-small">${x.send}</button>
        </div>
      </form>
    </section>
    <section class="card docs-card">
      <div class="docs-head">
        <h2 class="card-title">${x.docs}</h2>
        <label class="btn btn-secondary btn-small file-btn">${x.docUpload}<input type="file" data-upload="docs" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.dwg"></label>
      </div>
      <div class="chips" role="group" aria-label="${x.docType_label}">
        <button type="button" data-action="doc-filter" data-type="" aria-pressed="${!ui.docFilter}">${x.docAll}</button>
        ${types.map((ty) => `<button type="button" data-action="doc-filter" data-type="${ty}" aria-pressed="${ui.docFilter === ty}">${x.docType[ty]}</button>`).join("")}
      </div>
      <ul class="doc-list">${docs.map((d) => `<li><button type="button" class="doc-item" data-action="doc-open" data-doc="${d.id}">
        <span class="doc-icon doc-icon-${d.type}">${docIcon(d.type)}</span>
        <span class="doc-text"><strong>${esc(dn(d))}</strong><small>${x.docType[d.type]}, ${fill(x.uploadedBy, { who: d.by === role ? x.you : esc(partyName(d.by)), d: fmtDate(d.ts) })}</small></span>
        ${d.comments.length ? `<span class="doc-count" title="${x.comments}">${d.comments.length}</span>` : ""}
      </button></li>`).join("")}</ul>
    </section>
  </div>`;
}

let pendingChatDocs = [];

function guessType(file) {
  const n = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "photo";
  if (/rechnung|invoice|offerte|quote|faktura/.test(n)) return "invoice";
  if (/plan|grundriss|schnitt|ansicht|\.dwg$/.test(n)) return "plan";
  if (/vertrag|contract/.test(n)) return "contract";
  return "other";
}

function readFiles(files, type) {
  return Promise.all(Array.from(files).map((f) => new Promise((resolve) => {
    const base = { id: nextId("d"), name: f.name, type: type || guessType(f), size: f.size, by: session.role, ts: Date.now(), data: null, comments: [] };
    if (f.size > MAX_FILE) { base.tooBig = true; resolve(base); return; }
    const r = new FileReader();
    r.onload = () => { base.data = r.result; resolve(base); };
    r.onerror = () => resolve(base);
    r.readAsDataURL(f);
  })));
}

function addDocs(docs) {
  docs.forEach((d) => state.docs.push(d));
  if (!save()) {
    // Speicher voll: Dateiinhalt weglassen, nur Namen behalten
    docs.forEach((d) => { d.data = null; d.tooBig = true; });
    save();
  }
  docs.forEach((d) => toast(d.tooBig ? t().docTooBig : fill(t().attachedToast, { name: dn(d) })));
}

function openDoc(id) {
  const x = t(), d = state.docs.find((k) => k.id === id);
  if (!d) return;
  const isImg = dd(d) && dd(d).startsWith("data:image");
  let preview = `<p class="doc-preview-empty">${dd(d) ? x.docNoPreview : d.tooBig ? x.docTooBig : x.docDemo}</p>`;
  if (isImg) preview = `<img class="doc-preview-img" src="${dd(d)}" alt="${esc(dn(d))}">`;
  modal(`
    <h2>${esc(dn(d))}</h2>
    <p class="muted small">${x.docType[d.type]}, ${fill(x.uploadedBy, { who: esc(partyName(d.by)), d: fmtDT(d.ts) })}</p>
    <div class="doc-preview">${preview}</div>
    ${dd(d) && !isImg ? `<p><button type="button" class="btn btn-secondary btn-small" data-action="file-open" data-doc="${d.id}">${x.openFile}</button></p>` : ""}
    <h3 class="sub-title">${x.comments}</h3>
    <ul class="comments">${d.comments.length ? d.comments.map((c) => `<li><span class="avatar avatar-${c.by}" aria-hidden="true">${PEOPLE[c.by].initials}</span><div><p class="msg-meta"><strong>${c.by === session.role ? x.you : esc(partyName(c.by))}</strong> <time>${fmtDT(c.ts)}</time></p><p>${esc(c.key ? x[c.key] : c.text)}</p></div></li>`).join("") : `<li class="muted">${x.noComments}</li>`}</ul>
    <form class="comment-form" data-form="comment" data-doc="${d.id}">
      <label class="visually-hidden" for="comment-input">${x.commentPh}</label>
      <input id="comment-input" name="text" placeholder="${x.commentPh}" maxlength="1000">
      <button type="submit" class="btn btn-primary btn-small">${x.commentBtn}</button>
    </form>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="modal-close">${x.close}</button></div>`);
}

function openFile(id) {
  const d = state.docs.find((k) => k.id === id);
  if (!d || !dd(d)) return;
  const [meta, b64] = dd(d).split(",");
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  if (!/pdf|image/.test(mime)) a.download = dn(d);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- Hilfe bei Uneinigkeit ---------- */
function stageIndex(stage) {
  return { open: 1, proposed: 1, accepted: 2, mediation_done: 3, notary_requested: 4, resolved: 6 }[stage] ?? 0;
}

function vHelp() {
  const x = t(), role = session.role, d = state.dispute;
  const idx = d ? stageIndex(d.stage) : -1;
  let panel = `<section class="card"><p>${x.noDispute}</p></section>`;
  if (d) {
    const m = msById(d.ms), n = msIndex(d.ms) + 1;
    const ex = d.expert ? EXPERTS.find((e) => e.id === d.expert) : null;
    const head = `<p>${fill(x.dOpen, { n, name: esc(loc(m.name)), d: fmtDate(d.openedAt), who: esc(partyName(d.by)) })}</p><blockquote>${esc(d.reason)}</blockquote><p class="small muted">${chf(m.amount)}: ${x.inDispute}</p>`;
    let body = "";
    if (d.stage === "open") body = `<p>${x.dOpenNext}</p>`;
    if (d.stage === "proposed") {
      body = `<p><strong>${fill(x.dProposed, { who: esc(partyName(d.proposedBy)), expert: esc(loc(ex.name)), city: loc(ex.city) })}</strong></p>`;
      body += d.proposedBy === role ? `<p class="muted">${fill(x.dProposedWait, { other: esc(partyName(other(role))) })}</p>`
        : `<div class="row-actions"><button type="button" class="btn btn-primary btn-small" data-action="accept-expert">${x.accept}</button><button type="button" class="btn btn-secondary btn-small" data-action="repropose">${x.proposeOther}</button></div>`;
    }
    if (d.stage === "accepted") body = `<p>${fill(x.dAccepted, { expert: `<strong>${esc(loc(ex.name))}</strong>` })}</p><button type="button" class="btn btn-primary btn-small" data-action="mediation-done">${x.mediationDone}</button>`;
    if (d.stage === "mediation_done") {
      const a = m.amount * d.pct / 100;
      body = `<p>${x.dUpload}</p>
      <form class="agreement-form" data-form="agreement">
        <div class="field"><label for="ag-file">${x.agreementFile}</label><input type="file" id="ag-file" name="file" accept="application/pdf,image/*"></div>
        <label class="check"><input type="checkbox" name="sample" checked> <span>${x.useSample}</span></label>
        <div class="field"><label for="ag-pct">${x.outcome}</label>
          <input type="range" id="ag-pct" name="pct" min="0" max="100" step="5" value="${d.pct}" data-action="pct">
          <output id="ag-pct-out">${fill(x.outcomeVal, { pct: d.pct, a: num(a), b: num(m.amount - a), k: esc(PEOPLE.contractor.org), c: esc(PEOPLE.client.name) })}</output></div>
        <div class="form-row">
          <div class="field"><label for="ag-notary">${x.notaryName}</label><input id="ag-notary" name="notary" value="${esc(x.notaryDefault)}"></div>
          <div class="field"><label for="ag-notary-email">${x.notaryEmail}</label><input id="ag-notary-email" name="notaryEmail" type="email" value="notariat@example.com"></div>
        </div>
        <p class="field-error" id="ag-error"></p>
        <button type="submit" class="btn btn-primary">${x.uploadSubmit}</button>
      </form>`;
    }
    if (d.stage === "notary_requested") {
      const doc = state.docs.find((k) => k.id === d.doc);
      body = `<p>${fill(x.dRequested, { notary: `<strong>${esc(d.notary)}</strong>`, d: fmtDT(d.requestedAt) })}</p>
        ${doc ? `<div class="thumbs">${thumb(doc)}</div>` : ""}
        <p class="muted">${x.dRequestedWait}</p>
        <button type="button" class="btn btn-primary btn-small" data-action="certify">${x.simulateNotary}</button>`;
    }
    if (d.stage === "resolved") {
      body = `<p class="note-ok">${fill(x.dResolved, { notary: esc(d.notary), d: fmtDate(d.resolvedAt), a: num(m.resolution.a), b: num(m.resolution.b), k: esc(PEOPLE.contractor.org), c: esc(PEOPLE.client.name) })}</p>`;
    }
    panel = `<section class="card card-dispute">${head}${body}</section>`;
  }

  const canPropose = d && d.stage === "open";
  const experts = EXPERTS.map((e) => ({ ...e, km: distanceKm(PROJECT_LOC, e) }))
    .filter((e) => (!ui.canton || e.canton === ui.canton) && (!ui.kind || e.kind === ui.kind))
    .sort((a, b) => a.km - b.km);
  const cantons = [...new Set(EXPERTS.map((e) => e.canton))].sort();
  return `
  <div class="page-head"><h1>${x.helpTitle}</h1><p>${x.helpIntro}</p></div>
  <ol class="stepper">${x.helpSteps.map((s, i) => `<li class="${i < idx ? "done" : i === idx ? "current" : ""}"><span>${i + 1}</span>${s}</li>`).join("")}</ol>
  ${panel}
  <section class="card">
    <div class="docs-head">
      <div><h2 class="card-title">${x.experts}</h2><p class="muted small">${x.expertsHint}</p></div>
      <div class="filters">
        <label class="visually-hidden" for="f-canton">${x.allCantons}</label>
        <select id="f-canton" data-filter="canton"><option value="">${x.allCantons}</option>${cantons.map((c) => `<option ${ui.canton === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        <label class="visually-hidden" for="f-kind">${x.allKinds}</label>
        <select id="f-kind" data-filter="kind"><option value="">${x.allKinds}</option>${Object.keys(x.kind).map((k) => `<option value="${k}" ${ui.kind === k ? "selected" : ""}>${x.kind[k]}</option>`).join("")}</select>
      </div>
    </div>
    <ul class="experts">${experts.map((e, i) => `<li class="${d && d.expert === e.id ? "is-chosen" : ""}">
      <div class="expert-main"><strong>${esc(loc(e.name))}</strong><small>${x.kind[e.kind]}, ${loc(e.city)} (${e.canton}), ${e.langs}</small></div>
      <span class="expert-km">${fill(x.km, { km: Math.round(e.km) })}${i < 3 && !ui.canton && !ui.kind ? `<small>${x.nearby}</small>` : ""}</span>
      ${d && d.expert === e.id ? `<span class="badge badge-paid">${x.chosen}</span>` : canPropose ? `<button type="button" class="btn btn-secondary btn-small" data-action="propose" data-expert="${e.id}">${x.propose}</button>` : ""}
    </li>`).join("")}</ul>
  </section>
  <section class="card">
    <h2 class="card-title">${x.outbox}</h2>
    <p class="muted small">${x.outboxNote}</p>
    ${state.outbox.length ? `<ul class="outbox">${state.outbox.slice().reverse().map((o) => `<li><button type="button" class="doc-item" data-action="mail-open" data-mail="${o.id}"><span class="doc-icon">@</span><span class="doc-text"><strong>${esc(mailSubject(o))}</strong><small>${x.mailTo}: ${esc(o.kind === "mediator" ? expertName(o.to) : o.to)} &lt;${esc(o.toEmail)}&gt;, ${fmtDT(o.ts)}</small></span></button></li>`).join("")}</ul>` : `<p class="muted">${x.outboxEmpty}</p>`}
  </section>`;
}

function mailVars(o) {
  const ms = msById(o.p.ms);
  const fileDoc = state.docs.find((k) => k.id === o.p.file);
  return { ...o.p, file: fileDoc ? dn(fileDoc) : "", project: loc(state.contract.title), client: PEOPLE.client.name, contractor: PEOPLE.contractor.org, name: loc(ms.name), d: o.p.d ? fmtDT(o.p.d) : "" };
}
const mailSubject = (o) => fill(o.kind === "notary" ? t().mailNotarySubject : t().mailMediatorSubject, mailVars(o));
function openMail(id) {
  const x = t(), o = state.outbox.find((k) => k.id === id);
  if (!o) return;
  const body = fill(o.kind === "notary" ? x.mailNotaryBody : x.mailMediatorBody, mailVars(o));
  modal(`<h2>${esc(mailSubject(o))}</h2>
    <dl class="mail-head"><div><dt>${x.mailTo}</dt><dd>${esc(o.kind === "mediator" ? expertName(o.to) : o.to)} &lt;${esc(o.toEmail)}&gt;</dd></div><div><dt>${x.mailSent}</dt><dd>${fmtDT(o.ts)}</dd></div><div><dt>From</dt><dd>billDsmart &lt;contact@billDsmart.ch&gt;</dd></div></dl>
    <pre class="mail-body">${esc(body)}</pre>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="modal-close">${x.close}</button></div>`);
}

/* ---------- Premium (Teaser) ---------- */
function vPremium() {
  const x = t(), m = money();
  const nextMs = state.milestones.find((k) => k.status !== "paid");
  const rows = [
    { p: loc(state.contract.title), c: PEOPLE.client.name, v: TOTAL, l: m.locked, pd: m.paid, n: nextMs ? loc(nextMs.name) : "–", live: true },
    { p: loc({ de: "Neubau EFH Seeblick, Maur", en: "New detached house Lakeview, Maur" }), c: loc({ de: "Familie Beispiel", en: "The Example family" }), v: 36000, l: 21000, pd: 15000, n: loc({ de: "Innenausbau", en: "Interior finishing" }) },
    { p: loc({ de: "Schulhaus Matte, Sanierung, Dübendorf", en: "Matte school renovation, Dübendorf" }), c: loc({ de: "Schulgemeinde (Beispiel)", en: "School district (sample)" }), v: 124000, l: 88000, pd: 36000, n: loc({ de: "Turnhalle", en: "Gym" }) },
    { p: loc({ de: "Büro Bahnhofplatz, Umbau, Uster", en: "Station Square office refit, Uster" }), c: loc({ de: "Muster Immobilien AG", en: "Sample Real Estate Ltd" }), v: 22500, l: 0, pd: 22500, n: "–" },
  ];
  const months = lang === "de" ? ["Jun", "Jul", "Aug", "Sep", "Okt", "Nov"] : ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const vals = [12000, 18500, 9000, 26000, 21500, m.paid];
  const max = Math.max(...vals, 1);
  const locked = !state.premiumPreview;
  return `
  <div class="page-head"><h1>${x.premiumTitle} <span class="tag-premium tag-premium-lg">${x.premiumTag}</span></h1><p>${x.premiumLead}</p></div>
  <div class="premium-wrap ${locked ? "is-locked" : ""}">
    ${locked ? `<div class="premium-lock"><p><strong>${x.premiumTag}</strong> ${x.premiumPrice}</p><button type="button" class="btn btn-primary" data-action="premium-preview">${x.premiumUnlock}</button></div>` : `<p class="note-info">${x.premiumPreview}</p>`}
    <div class="premium-content" ${locked ? 'aria-hidden="true"' : ""}>
      <section class="card">
        <h2 class="card-title">${x.premiumTitle}</h2>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>${x.pProject}</th><th>${x.pClient}</th><th class="num">${x.pVolume}</th><th class="num">${x.pLocked}</th><th class="num">${x.pPaid}</th><th>${x.pNext}</th></tr></thead>
          <tbody>${rows.map((r) => `<tr class="${r.live ? "row-live" : ""}"><td><strong>${esc(r.p)}</strong></td><td>${esc(r.c)}</td><td class="num">${chf(r.v)}</td><td class="num">${chf(r.l)}</td><td class="num">${chf(r.pd)}</td><td>${esc(r.n)}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>
      <section class="card">
        <h2 class="card-title">${x.reportingTitle}</h2>
        <div class="kpis kpis-3">
          <div class="kpi"><span>${x.rOpen}</span><strong>${chf(rows.reduce((s, r) => s + r.l, 0))}</strong></div>
          <div class="kpi"><span>${x.rPaidMonth}</span><strong class="kpi-paid">${chf(21500 + m.paid)}</strong></div>
          <div class="kpi"><span>${x.rApproval}</span><strong>${fill(x.rDays, { n: "2,4" })}</strong></div>
        </div>
        <h3 class="sub-title">${x.rChart}</h3>
        <div class="bars">${vals.map((v, i) => `<div class="bar-col"><span class="bar-val">${num(v / 1000)}k</span><span class="bar-fill" style="height:${Math.max(4, (v / max) * 100)}%"></span><span class="bar-label">${months[i]}</span></div>`).join("")}</div>
        <p class="muted small">${x.rExport} (${x.planned})</p>
      </section>
    </div>
  </div>`;
}

/* ---------- Profil und KYC ---------- */
function vProfile() {
  const x = t(), role = session.role, p = PEOPLE[role];
  return `
  <div class="page-head"><h1>${x.profileTitle}</h1></div>
  <div class="grid-2">
    <section class="card">
      <h2 class="card-title">${role === "contractor" ? x.company : x.person}</h2>
      <dl class="terms">
        ${p.org ? `<div><dt>${x.company}</dt><dd>${esc(p.org)}</dd></div><div><dt>UID</dt><dd>${p.uid}</dd></div>` : ""}
        <div><dt>${x.person}</dt><dd>${esc(p.name)}</dd></div>
        <div><dt>${x.email}</dt><dd>${esc(p.email)}</dd></div>
        <div><dt>${x.address}</dt><dd>${esc(p.address)}</dd></div>
        <div><dt>${x.iban}</dt><dd><code>${p.iban}</code></dd></div>
      </dl>
    </section>
    <section class="card">
      <h2 class="card-title">${x.kycTitle} <span class="badge badge-paid">${x.kycDone}</span></h2>
      <ol class="kyc-list">${x.kycSteps[role].map((s) => `<li>${s}</li>`).join("")}</ol>
      <p class="muted small">${x.noWallet}</p>
    </section>
  </div>`;
}

/* ==========================================================
   Modal und Toast
   ========================================================== */
let lastFocus = null;
function modal(html) {
  lastFocus = document.activeElement;
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-backdrop" data-action="modal-close"></div><div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
  root.classList.add("is-open");
  const first = root.querySelector(".modal input:not([type=hidden]), .modal textarea, .modal button.btn-primary") || root.querySelector(".modal");
  first.focus();
}
function closeModal() {
  const root = $("#modal-root");
  root.classList.remove("is-open"); root.innerHTML = "";
  if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
}
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.classList.add("is-on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("is-on"), 4200);
}

/* ==========================================================
   Ereignisse
   ========================================================== */
function commit(msg) { save(); render(); if (msg) toast(msg); }

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "INPUT") return;
  const a = el.dataset.action, x = t(), role = session && session.role;
  switch (a) {
    case "nav": view = el.dataset.view; closeModal(); render(); $("#app-main").focus({ preventScroll: true }); window.scrollTo(0, 0); break;
    case "logout": Auth.logout(); location.href = "index.html"; break;
    case "switch-role": {
      const otherEmail = role === "client" ? "constructor@gmail.com" : "private.client@gmail.com";
      Auth.logout(); session = null; showLogin(otherEmail); break;
    }
    case "scenario": buildState(el.dataset.s); ui.deposit = 0; view = "overview"; render(); toast(fill(x.resetDone, { s: el.dataset.s === "start" ? x.scenStart : x.scenRunning })); break;
    case "simulate-deposit": runDeposit(); break;
    case "report": {
      const m = msById(el.dataset.ms), n = msIndex(m.id) + 1;
      const openTasks = m.tasks.filter((k) => !k.done).length;
      modal(`<h2>${fill(x.reportTitle, { n })}</h2><p><strong>${esc(loc(m.name))}</strong>, ${chf(m.amount)}</p>
        <p class="small"><strong>${x.criteria}:</strong> ${esc(loc(m.criteria))}</p>
        ${openTasks ? `<p class="note-warn">${fill(x.reportOpenTasks, { n: openTasks })}</p>` : ""}
        <form data-form="report" data-ms="${m.id}">
          <div class="field"><label for="rp-note">${x.reportNote}</label><textarea id="rp-note" name="note" rows="3" maxlength="1000"></textarea></div>
          <div class="field"><label for="rp-file">${x.reportPhoto}</label><input type="file" id="rp-file" name="file" accept="image/*,application/pdf" multiple></div>
          <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="modal-close">${x.cancel}</button><button type="submit" class="btn btn-primary">${x.reportSubmit}</button></div>
        </form>`);
      break;
    }
    case "approve": {
      const m = msById(el.dataset.ms), n = msIndex(m.id) + 1;
      modal(`<h2>${fill(x.approveTitle, { n })}</h2><p><strong>${esc(loc(m.name))}</strong></p>
        <p>${fill(x.approveText, { amount: num(m.amount), token: x.token, who: esc(PEOPLE.contractor.org) })}</p>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="modal-close">${x.cancel}</button><button type="button" class="btn btn-primary" data-action="approve-confirm" data-ms="${m.id}">${x.approveSubmit}</button></div>`);
      break;
    }
    case "approve-confirm": {
      const m = msById(el.dataset.ms);
      Actions.approve(m.id); closeModal(); commit(fill(x.approvedToast, { amount: num(m.amount), who: PEOPLE.contractor.org })); break;
    }
    case "dispute": {
      if (state.dispute && state.dispute.stage !== "resolved") { toast(x.disputeBusy); break; }
      const m = msById(el.dataset.ms), n = msIndex(m.id) + 1;
      modal(`<h2>${fill(x.disputeTitle, { n })}</h2><p><strong>${esc(loc(m.name))}</strong></p>
        <p>${fill(x.disputeText, { amount: num(m.amount) })}</p>
        <form data-form="dispute" data-ms="${m.id}">
          <div class="field"><label for="dp-reason">${x.disputeReason}</label><textarea id="dp-reason" name="reason" rows="3" maxlength="1000">${esc(x.reasonSample)}</textarea><p class="field-error" id="dp-error"></p></div>
          <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="modal-close">${x.cancel}</button><button type="submit" class="btn btn-danger">${x.disputeSubmit}</button></div>
        </form>`);
      break;
    }
    case "doc-open": openDoc(el.dataset.doc); break;
    case "file-open": openFile(el.dataset.doc); break;
    case "doc-filter": ui.docFilter = el.dataset.type; render(); break;
    case "mail-open": openMail(el.dataset.mail); break;
    case "propose": {
      const ex = EXPERTS.find((k) => k.id === el.dataset.expert);
      Actions.propose(ex.id, role); commit(fill(x.proposedToast, { expert: loc(ex.name), other: partyName(other(role)) })); break;
    }
    case "accept-expert": Actions.acceptExpert(); commit(x.acceptedToast); break;
    case "repropose": Actions.reproposeExpert(); commit(); break;
    case "mediation-done": Actions.mediationDone(); commit(); break;
    case "certify": Actions.certify(); commit(x.certifiedToast); break;
    case "premium-preview": state.premiumPreview = true; commit(); break;
    case "modal-close": closeModal(); break;
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.matches('[data-action="task-toggle"]')) {
    const m = msById(el.dataset.ms), k = m.tasks.find((z) => z.id === el.dataset.task);
    k.done = el.checked; commit(); return;
  }
  if (el.matches("[data-filter]")) { ui[el.dataset.filter] = el.value; render(); return; }
  if (el.matches('[data-upload="docs"]')) {
    const docs = await readFiles(el.files); addDocs(docs); render(); return;
  }
  if (el.matches('[data-upload="chat"]')) {
    pendingChatDocs = await readFiles(el.files);
    $("#chat-pending").textContent = pendingChatDocs.map((d) => d.name).join(", ");
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches('[data-action="pct"]')) {
    const d = state.dispute, m = msById(d.ms), pct = Number(el.value), a = m.amount * pct / 100;
    $("#ag-pct-out").textContent = fill(t().outcomeVal, { pct, a: num(a), b: num(m.amount - a), k: PEOPLE.contractor.org, c: PEOPLE.client.name });
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!form.dataset.form) return;
  e.preventDefault();
  const x = t(), role = session.role, fd = new FormData(form);
  switch (form.dataset.form) {
    case "sign":
      if (!fd.get("agree")) { $("#sign-error").textContent = x.signNeedAgree; return; }
      Actions.sign(); commit(x.signedToast); break;
    case "report": {
      const files = form.querySelector('input[type="file"]').files;
      const docs = files.length ? await readFiles(files, null) : [];
      docs.forEach((d) => { if (d.type === "other") d.type = "photo"; });
      addDocs(docs);
      Actions.report(form.dataset.ms, String(fd.get("note") || "").trim(), docs.map((d) => d.id));
      closeModal(); commit(x.reportedToast); break;
    }
    case "dispute": {
      const reason = String(fd.get("reason") || "").trim();
      if (!reason) { $("#dp-error").textContent = x.disputeReasonMissing; return; }
      Actions.dispute(form.dataset.ms, reason); closeModal(); view = "help"; commit(x.disputedToast); break;
    }
    case "task-add": {
      const text = String(fd.get("text") || "").trim();
      if (!text) return;
      msById(form.dataset.ms).tasks.push({ id: nextId("t"), text, done: false }); commit(); break;
    }
    case "chat": {
      const text = String(fd.get("text") || "").trim();
      if (!text && !pendingChatDocs.length) return;
      if (pendingChatDocs.length) addDocs(pendingChatDocs);
      state.messages.push({ id: nextId("c"), from: role, text, ts: Date.now(), docs: pendingChatDocs.map((d) => d.id) });
      pendingChatDocs = []; commit(); $("#chat-input").focus(); break;
    }
    case "comment": {
      const text = String(fd.get("text") || "").trim();
      if (!text) return;
      const d = state.docs.find((k) => k.id === form.dataset.doc);
      d.comments.push({ by: role, text, ts: Date.now() }); save(); render(); openDoc(d.id); break;
    }
    case "agreement": {
      const err = $("#ag-error");
      const file = form.querySelector('input[type="file"]').files[0];
      const useSample = !!fd.get("sample");
      const notary = String(fd.get("notary") || "").trim(), notaryEmail = String(fd.get("notaryEmail") || "").trim();
      if (!file && !useSample) { err.textContent = x.needFile; return; }
      if (!notary || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(notaryEmail)) { err.textContent = x.needNotary; return; }
      let doc;
      if (file) [doc] = await readFiles([file], "agreement");
      else doc = { id: nextId("d"), name: { de: "Schlichtungsvereinbarung_Meilenstein.pdf", en: "Mediation_agreement_milestone.pdf" }, type: "agreement", size: 120000, by: role, ts: Date.now(), data: null, comments: [] };
      addDocs([doc]);
      Actions.uploadAgreement(role, doc.id, Number(fd.get("pct")), notary, notaryEmail);
      commit(x.notaryToast); break;
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#modal-root").classList.contains("is-open")) closeModal();
});

window.addEventListener("storage", (e) => {
  if (e.key === STORE_KEY && session) { load(); render(); }
});

function runDeposit() {
  ui.deposit = 0; render();
  const x = t();
  const tick = () => {
    ui.deposit += 1;
    const lis = document.querySelectorAll("#deposit-steps li");
    lis.forEach((li, i) => li.classList.toggle("done", i < ui.deposit));
    if (ui.deposit < 3) setTimeout(tick, 700);
    else setTimeout(() => { Actions.deposit(); ui.deposit = 0; commit(fill(x.depositDone, { amount: num(TOTAL), token: x.token })); }, 600);
  };
  const btn = document.querySelector('[data-action="simulate-deposit"]');
  if (btn) btn.disabled = true;
  setTimeout(tick, 300);
}

/* ==========================================================
   Login-Ansicht und Start
   ========================================================== */
function showLogin(prefill) {
  const x = t();
  $("#app").hidden = true;
  $("#app-login").hidden = false;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-set-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)));
  document.title = x.title;
  $("#al-title").textContent = x.signIn;
  $("#al-email-label").textContent = x.email;
  $("#al-pw-label").textContent = x.password;
  $("#al-submit").textContent = x.signIn;
  $("#al-back").textContent = x.back;
  $("#al-demo").innerHTML = `<p><strong>${x.demoAccounts}</strong></p>
    <button type="button" class="demo-account" data-fill="private.client@gmail.com" data-pw="12345678"><span>${x.roleclient}</span><small>private.client@gmail.com</small><small>${x.password} 12345678</small></button>
    <button type="button" class="demo-account" data-fill="constructor@gmail.com" data-pw="87654321"><span>${x.rolecontractor}</span><small>constructor@gmail.com</small><small>${x.password} 87654321</small></button>`;
  $("#al-error").textContent = "";
  $("#al-password").value = "";
  if (prefill) $("#al-email").value = prefill;
  (prefill ? $("#al-password") : $("#al-email")).focus();
}

function showApp() {
  $("#app-login").hidden = true;
  $("#app").hidden = false;
  load();
  view = "overview";
  render();
}

function initLogin() {
  $("#al-demo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-fill]");
    if (!b) return;
    $("#al-email").value = b.dataset.fill; $("#al-password").value = b.dataset.pw; $("#al-submit").focus();
  });
  $("#app-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const x = t(), email = $("#al-email").value, pw = $("#al-password").value;
    if (!email.trim() || !pw) { $("#al-error").textContent = x.loginMissing; return; }
    const s = Auth.login(email, pw);
    if (!s) { $("#al-error").textContent = x.loginWrong; $("#al-password").select(); return; }
    session = s; showApp();
  });
}

function setLang(next) {
  lang = next === "en" ? "en" : "de";
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignorieren */ }
  if (session) render(); else showLogin($("#al-email").value);
}

document.addEventListener("DOMContentLoaded", () => {
  try { lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "de"; } catch (e) { /* ignorieren */ }
  document.querySelectorAll("[data-set-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.setLang)));
  initLogin();
  session = Auth.session();
  if (session) showApp(); else showLogin();
});
