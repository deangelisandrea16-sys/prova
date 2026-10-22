# prova

Repo di prova.

## Come lavoriamo

- **Claude (regia, in chat)**: priorità, messaggi a Claude Code, review delle PR (sicurezza compresa), verifica di CI/deploy/staging, documenti di stato. Non scrive codice applicativo, non gestisce chiavi, non tocca la production.
- **Claude Code (esecutore)**: codice, test, migrazioni, PR, merge delle PR di codice (una alla volta, con staging verde).
- **Andrea**: account, chiavi e Secrets, test sui telefoni, contenuti, decisioni di business.

## Documenti di stato

- [`docs/da-fare.md`](docs/da-fare.md) — lavoro in corso, prossimi passi, blocchi
- [`docs/decisions.md`](docs/decisions.md) — registro delle decisioni numerate
- [`docs/handover.md`](docs/handover.md) — stato attuale in breve
- [`SECURITY.md`](SECURITY.md) — checklist di review
