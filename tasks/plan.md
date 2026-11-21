# Implementation Plan: Географско откриване и филтриране на видеа

## Overview

Добавяме една вертикална функционалност за незадължително OpenStreetMap населено
място към видео, GPS-базирани най-близки предложения и филтриране в leaf
категория. Photon е единствената upstream услуга; няма платени ключове.

## Architecture Decisions

- Auth API проксира Photon search/reverse, налага timeout/cache/rate limit и нормализира
  само държави, региони, градове и села.
- Избран OSM резултат се cache-ва в `places`; `videos.place_id` остава nullable.
- GPS е foreground-only и координатите не се пазят като потребителска история.
- Без активен филтър video query остава обратно съвместим.
- Публичният Nominatim не се използва за autocomplete.

## Dependency Graph

```text
places schema + OSM proxy
        ↓
video place persistence/filter API
        ↓
mobile place selector + GPS permission
        ├── optional upload selection
        └── leaf-category filtering
```

## Task List

### Phase 1: API foundation

- [x] Task 1: Добавяне на places cache schema, модел и Photon search/reverse API.
- [x] Task 2: Добавяне на optional place към video create/serialization/filter.

### Checkpoint: API

- [x] PHP syntax/contract тестовете минават.
- [x] Query без place filter е обратно съвместима.

### Phase 2: Mobile vertical slice

- [x] Task 3: Общ location selector с foreground GPS, nearby и text suggestions.
- [x] Task 4: Незадължителен избор на място в upload flow и draft restore.
- [x] Task 5: Leaf-category търсене и video filter по избрано място.

### Checkpoint: Mobile

- [x] TypeScript, ESLint и focused tests минават.
- [x] Отказан GPS не блокира търсенето или upload-а.

### Phase 3: Delivery

- [x] Task 6: Attribution, environment guards, migration/deployment проверки.

### Checkpoint: Complete

- [x] Всички success criteria от `SPEC-video-place-discovery.md` са покрити.
- [ ] Production activation се прави само след успешни staging/schema проверки.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Public API throttling/outage | Medium | Backend cache, timeout, rate limit, retry UI |
| OSM inconsistent place tags | Medium | Strict normalization and supported-type allowlist |
| GPS privacy | High | Foreground permission; no coordinate history |
| Old videos regress | High | Nullable FK and no-filter characterization test |
| Large leaf result set | Medium | Server filtering and bounded suggestions |

## Open Questions

Няма. Одобрените решения са в `SPEC-video-place-discovery.md`.
