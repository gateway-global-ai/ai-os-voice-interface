# Legal & public compliance documents (registry)

**Plane:** Canonical **source of truth** for Privacy Policy, Terms of Service, and future legal/compliance pages lives here — **not** in application repositories as the authoritative text.

## Model

| Layer | Owns |
|-------|------|
| **`governing_docs/legal/`** | Policy text, version history, status, review/ratification trail, change log |
| **App repo(s)** | React (or other) **presentation**, routes (`/privacy`, `/terms`), deployment to public URLs |

**Rule:** `governing_docs` = **legal source of truth**. App = **public rendering layer** — mirror **approved** text only; keep versions aligned.

These artifacts are:

- public promises  
- compliance inputs  
- OAuth / app-store verification inputs where applicable  
- potentially contract language  

They follow the same governance pattern as other controlled docs: **draft → review → counsel review where required → ratify → publish** (and mirror to app).

## Registry

| ID | Title | File | Status |
|----|-------|------|--------|
| **LEGAL-001** | Privacy Policy | [LEGAL-001-Privacy-Policy.md](./LEGAL-001-Privacy-Policy.md) | draft |
| **LEGAL-002** | Terms of Service | [LEGAL-002-Terms-of-Service.md](./LEGAL-002-Terms-of-Service.md) | draft |

Update this table when status or filenames change.

## Workflow (practical)

1. Edit canonical text **here** (or propose via amendment/PR per org process).  
2. Run governance review; obtain **counsel review** before treating text as compliance-grade.  
3. Set front matter `status` to **approved_for_publication** (or org equivalent) and record `ratified` / `reviewers`.  
4. Mirror the **approved** body into the app’s legal page components (Gateway client or other); cite **document_id + version** in the app PR or release notes.  
5. On subsequent legal changes: bump version here first, re-approve, then sync app.

## Caution

Operational placeholder wording is **not** substitute for counsel-approved text. Do not represent pages as final for **compliance** or **OAuth verification** until review is complete.

## Related

- Public URLs (when deployed): see **[WORKSPACE.md](../../WORKSPACE.md)** in this repo — § *Google OAuth consent screen — Privacy & Terms URLs* and § *Legal pages — source of truth vs app rendering*.
