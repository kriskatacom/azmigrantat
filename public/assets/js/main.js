// (function () {
//     const defaultImage = "/assets/images/no-image.png";

//     function fixImage(img) {
//         if (img.dataset.fixed) return;
//         img.src = defaultImage;
//         img.srcset = "";
//         img.style.setProperty("width", "100%", "important");
//         img.style.setProperty("height", "100%", "important");
//         img.style.setProperty("object-fit", "cover", "important");
//         img.classList.add("image-fallback");
//         img.dataset.fixed = "true";
//     }

//     document.addEventListener(
//         "error",
//         function (e) {
//             if (e.target.tagName === "IMG") {
//                 fixImage(e.target);
//             }
//         },
//         true,
//     );

//     window.addEventListener("DOMContentLoaded", function () {
//         document.querySelectorAll("img").forEach((img) => {
//             if (img.complete && img.naturalWidth === 0) {
//                 fixImage(img);
//             }
//         });
//     });
// })();

// // Обединена функция за поздравителна нотификация
// function showPwaNotification(customMessage = null) {
//     const options = {
//         body:
//             customMessage ||
//             "Добре дошли в KRISKATA.COM! Благодарим ви, че ни посетихте.",
//         icon: "/assets/images/android-chrome-192x192.png",
//         badge: "/assets/images/favicon-32x32.png",
//         vibrate: [200, 100, 200],
//         tag: "welcome-message",
//         renotify: true,
//     };

//     if ("serviceWorker" in navigator) {
//         navigator.serviceWorker.ready.then((registration) => {
//             registration.showNotification("KRISKATA.COM", options);
//         });
//     } else if (Notification.permission === "granted") {
//         new Notification("KRISKATA.COM", options);
//     }
// }

// window.addEventListener("load", () => {
//     if ("Notification" in window) {
//         Notification.requestPermission().then((permission) => {
//             if (permission === "granted") {
//                 // Изчакваме 3 секунди след пълно зареждане
//                 setTimeout(() => {
//                     showPwaNotification();
//                 }, 3000);
//             }
//         });
//     }
// });