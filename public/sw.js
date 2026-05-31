// const CACHE_NAME = "kriskata-v1";

// self.addEventListener("install", (event) => {
//     self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//     event.waitUntil(clients.claim());
// });

// // Подобрен Fetch оператор за избягване на грешки в core.js
// self.addEventListener("fetch", (event) => {
//     event.respondWith(
//         fetch(event.request).catch(() => {
//             // Ако мрежата се срине, тук можеш да върнеш кеширана версия
//             return caches.match(event.request);
//         }),
//     );
// });

// // Push нотификации с максимална защита от undefined payload
// self.addEventListener("push", (event) => {
//     let message = "Имате ново известие!";

//     if (event.data) {
//         try {
//             const data = event.data.json();
//             // Проверка за payload ИЛИ директен текст в JSON
//             message =
//                 data.payload ||
//                 data.message ||
//                 data.text ||
//                 (typeof data === "string" ? data : message);
//         } catch (e) {
//             // Ако не е JSON, вземаме го като чист текст
//             message = event.data.text() || message;
//         }
//     }

//     const options = {
//         body: message,
//         icon: "/assets/images/android-chrome-192x192.png",
//         badge: "/assets/images/favicon-32x32.png",
//         vibrate: [100, 50, 100],
//         data: { dateOfArrival: Date.now() },
//     };

//     event.waitUntil(
//         self.registration.showNotification("KRISKATA.COM", options),
//     );
// });
