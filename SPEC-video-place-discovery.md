# Spec: Географско откриване и филтриране на видеа

## Objective

Една вертикална функционалност позволява към ново видео по желание да се избере
държава, регион, град или село. В крайното ниво на категориите потребителят може
да търси такова населено място, да вижда предложения, подредени по реално
географско разстояние от текущата позиция на телефона, и да филтрира видеата.

Приемаме следното:

- Източникът е OpenStreetMap чрез публичния Photon API за текстови предложения
  и reverse/nearby `place=country|state|region|city|town|village|hamlet` резултати.
- Мобилният клиент не вика публичните услуги директно. Auth API е ограничен
  proxy с cache, timeout, rate limiting и идентифициращ `User-Agent`.
- Не използваме публичния Nominatim за autocomplete, защото официалната му
  политика изрично забранява този сценарий.
- GPS се използва само след foreground разрешение. Текущите координати се
  изпращат само за изчисляване на предложения и не се записват като история.
- При отказано GPS разрешение текстовото търсене остава напълно достъпно, но
  няма секция „Най-близо до вас“.
- Изборът при качване е незадължителен. Съществуващите и новите видеа с `NULL`
  населено място продължават да се показват по досегашния начин, когато няма
  активен географски филтър.
- Активен филтър изключва видеата без населено място. Държава или регион включва
  видеата от неговите наследници; конкретен град/село филтрира точно по него.

## Tech Stack

- Expo / React Native / TypeScript в `app/chat-app`.
- `expo-location` за foreground координати и native permission flow.
- PHP API и Eloquent в `auth`.
- MySQL cache таблица `places` и nullable `videos.place_id`.
- Photon (`photon.komoot.io`) върху OpenStreetMap данни, без API ключ и без
  платена зависимост.

## Commands

- TypeScript: `cd app/chat-app && npx tsc --noEmit`
- Lint: `cd app/chat-app && npx eslint src/app/categories.tsx src/app/videos/upload.tsx src/components/location src/services/places.ts`
- Unit tests: `cd app/chat-app && npx vitest run tsconfig/tests/unit/video-place-discovery-contract.test.ts`
- PHP syntax на сървъра: `php -l auth/app/Controllers/Api/PlaceController.php`
- Migrations: `php auth/vendor/bin/phinx migrate -c auth/phinx.php -e staging`

## Project Structure

- `auth/database/migrations/` — каталогът и nullable връзката към видеата.
- `auth/app/Models/Place.php` — йерархия и координати на населените места.
- `auth/app/Controllers/Api/PlaceController.php` — текстово/най-близко търсене.
- `auth/app/Controllers/Api/VideoController.php` — optional `place_id` и филтър.
- `auth/app/Services/OpenStreetMapPlaceService.php` — Photon proxy,
  нормализация, cache и ограничения.
- `app/chat-app/src/services/places.ts` — типизиран API клиент.
- `app/chat-app/src/components/location/` — споделен селектор без странични ефекти.
- `app/chat-app/src/app/videos/upload.tsx` — незадължителен избор.
- `app/chat-app/src/app/categories.tsx` — търсене само в leaf категория.

## Code Style

```ts
type SelectedPlace = {
  id: number;
  name: string;
  type: "country" | "region" | "city" | "village";
};

const filters = selectedPlace ? { placeId: selectedPlace.id } : {};
```

- TypeScript типовете са изрични; липсващо място е `null`, не празен низ.
- API не приема свободен SQL/тип на място от клиента; валидира подписан резултат
  или вече cache-нат `place_id` преди свързване с видео.
- Търсенето се debounce-ва и отменя предходната заявка.
- Разстоянието се изчислява на сървъра и се връща в километри.
- Photon заявките започват от 3 символа, cache-ват се и се ограничават, за да
  останат в рамките на разумната употреба на публичната инстанция.

## Testing Strategy

- Contract тест за nullable миграцията, API маршрутите и мобилните payload-и.
- Unit тестове за query параметрите и поведение без GPS разрешение.
- Backend проверки за hierarchy филтър и Haversine сортиране.
- Регресия: заявка без `place_id` връща същия набор като преди промяната.
- Ръчна проверка на staging: разрешен/отказан GPS, upload със/без място,
  филтър държава/регион/град/село и старо видео без място.

## Boundaries

- Always: optional upload field; foreground permission; минимални координати;
  валидиран `place_id`; „© OpenStreetMap contributors“ attribution; cache,
  timeout и rate limiting на публичните API; индексирани заявки.
- Ask first: промяна на Photon endpoint; background location; записване на
  история на местоположението; автоматично местоположение без избор.
- Never: задължителен GPS; скрито проследяване; изтриване/скриване на старите
  видеа; промяна на други category/upload функционалности.

## Success Criteria

1. Търсачката се вижда само след достигане на leaf категория.
2. При разрешен GPS показва най-близките населени места, сортирани по разстояние.
3. Текстовото търсене намира държави, региони, градове и села независимо от GPS.
4. Избрано място филтрира видеата според йерархичните правила.
5. Upload екранът позволява избор и премахване на място, но не го изисква.
6. Новото видео пази избраното място; старите записи остават с `NULL`.
7. Без активен филтър старите видеа се показват без регресия.
8. Отказано GPS разрешение не блокира категориите, upload-а или търсенето.
9. Няма background location и няма съхранена история на GPS координатите.

## Open Questions

Няма. Източникът, privacy поведението, йерархията и fallback-ът са фиксирани от
горните допускания. Ако публична инстанция временно не отговаря, cache-натите
места и видеата продължават да работят, а UI показва възможност за повторен опит.
