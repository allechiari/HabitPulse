from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether

ROOT = Path(r"C:\Users\a.chiari\source\repos\Habit")
OUT = ROOT / "docs" / "relazione" / "Relazione_HabitPulse.pdf"
BLUE = colors.HexColor("#2E74B5")
DARK = colors.HexColor("#1F4D78")
LIGHT = colors.HexColor("#F2F4F7")
MUTED = colors.HexColor("#666666")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=34, textColor=DARK, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name="ReportSubtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=15, leading=18, textColor=MUTED, alignment=TA_CENTER, spaceAfter=7))
styles.add(ParagraphStyle(name="ReportAuthor", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=15, alignment=TA_CENTER, spaceAfter=26))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLUE, spaceBefore=10, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=BLUE, spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=14.2, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle(name="Bulletx", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=14, leftIndent=18, firstLineIndent=-10, alignment=TA_LEFT, spaceAfter=4))
styles.add(ParagraphStyle(name="Codex", parent=styles["Code"], fontName="Courier", fontSize=9, leading=12, leftIndent=18, rightIndent=18, borderPadding=7, backColor=LIGHT, spaceBefore=3, spaceAfter=7))
styles.add(ParagraphStyle(name="Indexx", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=15, spaceAfter=2))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.drawCentredString(letter[0] / 2, 0.42 * inch, str(doc.page))
    canvas.restoreState()


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def bullet(label, text):
    return P(f"• <b>{label}:</b> {text}", "Bulletx")


def simple_bullet(text):
    return P(f"• {text}", "Bulletx")


def styled_table(data, widths):
    t = Table([[P(str(c), "Bodyx") for c in row] for row in data], colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8C0C8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


story = []
story += [Spacer(1, 0.48 * inch), P("HabitPulse", "ReportTitle"), P("Relazione di progetto", "ReportSubtitle"), P("Alessandro Chiari", "ReportAuthor"), P("Indice", "H1x")]
for n, title, page, indent in [
    ("1", "Introduzione", 2, 0), ("2", "Obiettivo", 2, 0), ("3", "Funzionalità principali", 2, 0),
    ("3.1", "Accesso e profilo", 2, 12), ("3.2", "Dashboard e attività", 2, 12), ("3.3", "Progressi e analisi", 2, 12),
    ("4", "Architettura e database", 3, 0), ("5", "Tecnologie utilizzate", 4, 0),
    ("6", "Sicurezza e stato del progetto", 4, 0), ("7", "Verifiche effettuate", 5, 0),
    ("8", "Manuale d'uso e installazione", 6, 0),
]:
    st = ParagraphStyle(f"idx{n}", parent=styles["Indexx"], leftIndent=indent)
    story.append(Paragraph(f"<b>{n}&nbsp;&nbsp; {title}</b>{'.' * max(3, 64-len(title))} {page}", st))

story.append(PageBreak())
story += [P("1  Introduzione", "H1x"), P("HabitPulse è un'applicazione web full stack dedicata alla gestione delle abitudini quotidiane. Permette a ogni utente di registrare attività positive, chiamate habit, e comportamenti da limitare, chiamati vizi. Il progetto utilizza un'architettura client-server basata su React, Node.js, Express e MongoDB."), P("2  Obiettivo", "H1x"), P("L'obiettivo è offrire uno strumento semplice per:")]
for x in ["creare e organizzare le proprie attività quotidiane;", "registrare un contatore e un obiettivo giornaliero;", "distinguere le buone abitudini dai comportamenti da ridurre;", "osservare l'andamento nel tempo attraverso riepiloghi e grafici;", "mantenere separati i dati dei diversi utenti."]:
    story.append(simple_bullet(x))
story += [P("3  Funzionalità principali", "H1x"), P("3.1  Accesso e profilo", "H2x"), bullet("Registrazione", "creazione di un account con nome, cognome, email, password e telefono opzionale."), bullet("Login", "accesso tramite email e password; la password viene confrontata con l'hash salvato nel database."), bullet("Profilo", "modifica dei dati personali, cambio password, logout e cancellazione dell'account."), P("3.2  Dashboard e attività", "H2x"), bullet("Creazione", "inserimento di titolo, tipo, descrizione, date, colore, unità di misura e obiettivo."), bullet("Gestione", "modifica del colore e dell'obiettivo, riordinamento tramite drag and drop e arresto di un'attività."), bullet("Visualizzazione", "possibilità di mostrare o nascondere le attività terminate."), P("3.3  Progressi e analisi", "H2x"), bullet("Progresso giornaliero", "aggiornamento del contatore e del target della giornata."), bullet("Analisi", "filtri settimanali, mensili, annuali o personalizzati, grafici percentuali, copertura dei dati e calendario riepilogativo.")]

story.append(PageBreak())
story += [P("4  Architettura e database", "H1x"), P("Il frontend comunica con il backend tramite API REST che scambiano dati in formato JSON. Il server applica la logica dell'applicazione e usa Mongoose per leggere e scrivere i documenti su MongoDB Atlas."), styled_table([["Componente", "Responsabilità"], ["Client React", "Interfaccia, navigazione, form, dashboard e grafici."], ["API Express", "Rotte per autenticazione, habit, progressi e analisi."], ["MongoDB", "Persistenza di utenti, attività e valori giornalieri."]], [1.75*inch, 4.75*inch]), P("4.1  Users", "H2x"), P("La collezione degli utenti contiene nome, cognome, email univoca, password cifrata, telefono e date di creazione e aggiornamento."), P("4.2  Habits", "H2x"), P("Ogni attività è collegata a un utente e contiene titolo, tipo (habit o vice), descrizione, data iniziale e finale, colore, ordine, obiettivo predefinito, unità di misura e stato di arresto."), P("4.3  DailyProgress", "H2x"), P("Il progresso giornaliero collega un'attività a una data e salva contatore e target. Un indice composto impedisce di avere due record per la stessa attività nello stesso giorno."), P("4.4  Principali endpoint", "H2x"), styled_table([["Area", "Metodo", "Endpoint"], ["Autenticazione", "POST", "/api/auth/register - /login"], ["Attività", "GET/POST/PATCH", "/api/habits"], ["Progressi", "GET/PATCH", "/api/progress"], ["Analisi", "GET", "/api/analysis"]], [1.55*inch, 1.55*inch, 3.4*inch])]

story.append(PageBreak())
story += [P("5  Tecnologie utilizzate", "H1x"), bullet("Frontend", "React 19, Vite, React Router DOM e Recharts."), bullet("Backend", "Node.js, Express.js, bcryptjs, CORS e dotenv."), bullet("Database", "MongoDB Atlas con ODM Mongoose."), bullet("Sviluppo", "ESLint, Nodemon e Concurrently."), P("6  Sicurezza e stato del progetto", "H1x"), P("Le password vengono cifrate con bcrypt prima del salvataggio. In fase di registrazione viene richiesta una password di almeno otto caratteri, con maiuscola, minuscola, numero e carattere speciale. L'email è unica nel database."), P("Il progetto è funzionante come prototipo locale, ma alcune parti devono essere completate prima di una pubblicazione reale:")]
for x in ["introdurre autenticazione e autorizzazione server-side tramite token o sessione;", "ricavare l'identità dell'utente dalla sessione invece di accettare liberamente userId dal client;", "spostare l'indirizzo delle API in una variabile di ambiente;", "limitare CORS alle origini autorizzate e aggiungere protezione dai tentativi ripetuti di login;", "eliminare in modo coerente habit e progressi quando viene cancellato un account;", "rimuovere e ruotare qualsiasi credenziale di database comparsa nel codice o nella cronologia Git;", "definire in modo esplicito il fuso orario usato per i progressi giornalieri."]:
    story.append(simple_bullet(x))
story += [P("6.1  Gestione dei progressi", "H2x"), P("Attualmente l'apertura della dashboard crea automaticamente il progresso del giorno con valore zero. Prima di considerare definitivo il calcolo della copertura, è necessario decidere se un giorno debba risultare tracciato solo dopo un'azione esplicita dell'utente.")]

story.append(PageBreak())
story += [P("7  Verifiche effettuate", "H1x"), P("Durante la revisione del progetto sono stati eseguiti controlli automatici sul frontend e sul backend. La tabella seguente riporta esclusivamente verifiche realmente eseguite sul codice attuale."), styled_table([["Controllo", "Risultato", "Nota"], ["ESLint frontend", "SUPERATO", "Nessun errore segnalato."], ["Build Vite", "SUPERATO", "Build di produzione completata."], ["Sintassi Node.js", "SUPERATO", "Controller, modelli, rotte e configurazione validi."], ["Test automatici", "ASSENTI", "Non è presente una suite di test nel repository."]], [1.8*inch, 1.35*inch, 3.35*inch]), P("7.1  Test consigliati", "H2x")]
for x in ["registrazione, login, modifica profilo e cambio password;", "isolamento dei dati tra due utenti diversi;", "creazione, modifica, arresto e riordinamento delle attività;", "aggiornamento concorrente dei progressi giornalieri;", "calcolo delle percentuali per habit e vizi;", "intervalli di date, cambio del giorno e fusi orari;", "cancellazione completa dell'account e dei dati collegati."]:
    story.append(simple_bullet(x))
story += [P("7.2  Nota sulle prestazioni", "H2x"), P("La build segnala un bundle JavaScript principale superiore a 500 kB. Il comportamento non impedisce l'avvio, ma in futuro è consigliabile caricare in modo differito la pagina di analisi e la libreria dei grafici.")]

story.append(PageBreak())
story += [P("8  Manuale d'uso e installazione", "H1x"), P("Per eseguire HabitPulse in locale sono necessari Node.js, npm e un database MongoDB raggiungibile."), P("8.1  Installazione", "H2x"), P("Dalla cartella principale del progetto installare le dipendenze dei tre livelli:"), P("npm install<br/>cd client &amp;&amp; npm install<br/>cd ../server &amp;&amp; npm install", "Codex"), P("8.2  Configurazione del server", "H2x"), P("Creare un file .env nella cartella server senza inserirlo nel repository:"), P("PORT=5000<br/>MONGO_URI=mongodb+srv://&lt;utente&gt;:&lt;password&gt;@&lt;cluster&gt;/habitpulse", "Codex"), P("8.3  Avvio", "H2x"), P("Per avviare frontend e backend insieme, dalla cartella principale eseguire:"), P("npm run dev", "Codex"), P("Il frontend è normalmente disponibile su http://localhost:5173, mentre il backend risponde su http://localhost:5000."), P("8.4  Utilizzo essenziale", "H2x")]
for i, x in enumerate(["Registrare un nuovo account oppure effettuare il login.", "Creare una nuova attività dalla dashboard, scegliendo se si tratta di un habit o di un vizio.", "Aggiornare ogni giorno contatore e obiettivo.", "Usare il trascinamento per modificare l'ordine delle schede.", "Consultare i riepiloghi dalla pagina Analysis e gestire dati, password e account dalla pagina Profile."], 1):
    story.append(P(f"{i}. {x}", "Bulletx"))

doc = SimpleDocTemplate(str(OUT), pagesize=letter, rightMargin=inch, leftMargin=inch, topMargin=0.82*inch, bottomMargin=0.72*inch, title="Relazione HabitPulse", author="Alessandro Chiari")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
