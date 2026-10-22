# Sicurezza — checklist di review

Da verificare su ogni PR prima del merge.

## Dati e database
- [ ] RLS attiva su ogni tabella esposta, con policy esplicite
- [ ] Grant minimi: ogni ruolo ha solo i permessi che gli servono
- [ ] Funzioni `security definer` con `search_path` vuoto (`set search_path = ''`) e nomi qualificati
- [ ] Migrazioni solo additive, ognuna con il suo rollback
- [ ] Dati personali minimi: si raccoglie e si conserva solo ciò che serve

## Segreti
- [ ] Nessun segreto nel codice, nei commit, nei test o nei log
- [ ] Segreti solo nei Secrets dell'ambiente (GitHub/servizio)
- [ ] Variables passate ai tool tramite file JSON, mai come argomenti della shell

## Input e shell
- [ ] Nessun input (utente, PR, issue, Variables) interpolato nei comandi shell o negli script di CI
- [ ] Input validati lato server

## Autenticazione e sessioni
- [ ] Sessioni in cookie `HttpOnly` (+ `Secure`, `SameSite`), mai in `localStorage`
- [ ] Controlli di autorizzazione lato server
- [ ] 2FA/TOTP obbligatorio per lo staff
- [ ] Rate limit sul login
- [ ] Controllo delle password, anche contro quelle violate
- [ ] Errori che non rivelano informazioni (distinguere "troppi tentativi" da "non valido" solo se il blocco dipende dall'IP)

## Tracciabilità
- [ ] Audit log delle azioni sensibili (chi, cosa, quando), senza dati personali o segreti
