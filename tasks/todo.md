# Географско откриване и филтриране на видеа

- [x] Task 1: Places cache и публичен OSM proxy
  - Acceptance: Photon text search и reverse nearby връщат единен place shape.
  - Acceptance: API има timeout, cache, rate limit и OSM attribution.
  - Verify: focused PHP/contract tests и syntax checks.
  - Files: migration, `Place.php`, service, controller, routes.

- [x] Task 2: Optional video place metadata
  - Acceptance: upload приема валиден optional place; старият payload остава валиден.
  - Acceptance: category video query филтрира exact locality или hierarchy.
  - Verify: video API contract/regression tests.
  - Files: migration, `Video.php`, `VideoController.php`, serializer tests.

## Checkpoint: API

- [x] Schema и API договорите минават без регресия.

- [x] Task 3: Общ мобилен place selector
  - Acceptance: foreground GPS показва nearest; отказан permission оставя text search.
  - Acceptance: търсенето започва от 3 символа, debounce-ва и отменя стара заявка.
  - Verify: TypeScript, ESLint и service tests.
  - Files: dependency/config, service, component.

- [x] Task 4: Optional upload place
  - Acceptance: мястото може да се избере/премахне и се пази в draft.
  - Acceptance: upload без място е непроменен.
  - Verify: upload contract test.
  - Files: upload screen, draft service, videos service/types.

- [x] Task 5: Leaf-category filter
  - Acceptance: селекторът се вижда само при leaf category.
  - Acceptance: избор/изчистване презарежда video results.
  - Verify: categories contract test and TypeScript.
  - Files: categories screen, places service/component integration.

## Checkpoint: Mobile

- [x] TypeScript, ESLint и focused tests минават.

- [x] Task 6: Delivery checks
  - Acceptance: OSM attribution се вижда в selector UI.
  - Acceptance: migrations са additive и production activation има rollback.
  - Verify: diff check, full focused suite, staging migration check.

## Checkpoint: Complete

- [x] Всички критерии от спецификацията са изпълнени.
