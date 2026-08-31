# HabitPulse

HabitPulse è una web app full stack per gestire abitudini e vizi giornalieri.

L'idea è semplice: ogni utente può registrarsi, fare login, creare le proprie attività, aggiornare i progressi della giornata e vedere un'analisi dell'andamento nel tempo.

## Cosa fa

- registrazione e login utente
- dashboard con habit e vice
- creazione, modifica, stop e ordinamento delle attività
- salvataggio dei progressi giornalieri
- pagina profilo per modificare dati e password
- pagina analisi con filtri data e grafici

## Tecnologie usate

Frontend:
- React
- Vite
- React Router
- Recharts

Backend:
- Node.js
- Express
- MongoDB con Mongoose
- bcryptjs per le password
- dotenv per le variabili ambiente
- cors


## Struttura del progetto

```txt
HabitPulse/
  client/   frontend React
  server/   backend Node/Express
```

## Come avviare il progetto

Installa le dipendenze principali:

```bash
npm install
```

Installa quelle del client:

```bash
cd client
npm install
```

Installa quelle del server:

```bash
cd ../server
npm install
```

Nel server serve un file `.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

La stringa MongoDB deve puntare al database `habitpulse`.

Esempio:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/habitpulse?retryWrites=true&w=majority
```

## Avvio

Per avviare tutto insieme dalla cartella principale:

```bash
npm run dev
```

Oppure separato:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Il frontend parte di solito su:

```txt
http://localhost:5173
```

Il backend parte su:

```txt
http://localhost:5000
```


## Autore

Alessandro Chiari
