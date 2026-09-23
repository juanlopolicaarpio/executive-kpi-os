# Public-release data and safety model

This repository was created with fresh history from a system built and shipped for a real operating business. It is not a visibility change or history rewrite of a production repository.

## Included

- Fictional company and employee identities.
- Deterministic synthetic metrics and operational events.
- Genericized architecture, domain logic, and interface patterns.
- Placeholder environment-variable documentation.
- Reference migrations suitable only for a disposable demonstration environment.

## Excluded

- Client names, source exports, spreadsheets, contracts, personal data, credentials, production identifiers, and deployment history.
- Any connection to a production database, messaging account, model account, or analytics property.
- Original repository history.

## Guardrails

1. The demo must build and run without secrets.
2. `.env*` files are ignored except `.env.example`.
3. CI scans the repository for common credential patterns.
4. Demonstration identities use reserved `.example` addresses.
5. Public releases are prepared from this repository only after a fresh safety review.

## Disclosure

> This system is based on software built and shipped for a real operating business. Company names, people, identifiers, and metrics have been replaced with fictional or synthetic equivalents. It is not connected to a production client environment.
