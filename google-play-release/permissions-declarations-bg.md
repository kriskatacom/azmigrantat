# Чернова за Play permissions declarations

Текстовете са чернови по реалния код. Подайте ги само след device video
демонстрация и потвърждение, че поведението на финалния Play build съвпада.

## Full-screen intent

**Core functionality:** receiving audio and video calls.

„Ето ме“ използва full-screen intent само за входящо аудио или видеообаждане,
за да покаже на потребителя кой се обажда и действия за приемане или отказ,
включително когато екранът е заключен. Не се използва за реклами, промоции или
общи съобщения.

Demo video: покажете входящо обаждане при заключен екран, Accept, Decline и
fallback поведение при изключен full-screen access.

## Foreground service — camera/microphone/media playback

„Ето ме“ стартира foreground service по време на активен аудио/видеоразговор.
Услугата поддържа микрофона и, при видеоразговор, камерата, докато приложението
не е на преден план. Потребителят започва или приема разговора, вижда ongoing
call notification и може да прекрати разговора. Услугата спира при край на
разговора.

Demo video: start/accept call, background app, show ongoing notification,
return to call, stop call and show that notification/service ends.

## Foreground service — dataSync

„Ето ме“ използва user-initiated foreground data sync само за качване на видео.
По време на качването има постоянна notification с progress и действие
„Прекрати качването“. Услугата е `START_NOT_STICKY`, държи wake lock само за
активния transfer и спира при успех, грешка или отказ от потребителя.

Demo video: select a video, begin upload, background app, show progress
notification, cancel one upload, then complete a second upload.

## Camera

Използва се за видеоразговори, снимане на изображение за чат/профил/thumbnail и
сканиране на банкова карта по изрично действие на потребителя.

## Microphone

Използва се за аудио/видеоразговори и запис на аудио съобщение по изрично
действие на потребителя.

## Notifications

Използват се за нови чат съобщения, състояние на видео обработка, входящи и
пропуснати обаждания и видим progress на user-initiated video upload.

## Photo/video/files

Приложението използва system image/document pickers за избрани от потребителя
снимки, видеа и файлове. Не е установена broad media permission
`READ_MEDIA_IMAGES` или `READ_MEDIA_VIDEO` в Expo config. Потвърдете това от
окончателния merged manifest на `.aab`.
