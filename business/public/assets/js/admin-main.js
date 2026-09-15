function toggleSidebarState(isOpen) {
    fetch("/admin/sidebar-toggle", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ sidebarOpen: isOpen }),
    }).catch((error) => console.error("Error toggling sidebar:", error));
}

document.addEventListener("submit", function (e) {
    const btn = e.target.querySelector(".js-admin-submit-btn");

    if (btn) {
        if (!e.target.checkValidity()) return;

        btn.disabled = true;

        const icon = btn.querySelector(".js-btn-icon");
        const spinner = btn.querySelector(".js-btn-spinner");
        const textSpan = btn.querySelector(".js-btn-text");

        if (icon) icon.style.setProperty("display", "none", "important");

        if (spinner)
            spinner.style.setProperty("display", "inline-block", "important");

        if (textSpan) textSpan.innerText = "Обработка...";

        setTimeout(() => {
            if (btn.disabled) {
                btn.disabled = false;
                if (icon) icon.style.display = "inline-block";
                if (spinner) spinner.style.display = "none";
                if (textSpan) textSpan.innerText = "<?= $text ?>";
            }
        }, 10000);
    }
});

const ScrollManager = {
    storageKey: "page_scroll_position",

    save: function () {
        sessionStorage.setItem(this.storageKey, window.scrollY);
    },

    restore: function () {
        const pos = sessionStorage.getItem(this.storageKey);
        if (pos) {
            window.scrollTo(0, parseInt(pos));
            sessionStorage.removeItem(this.storageKey);
        }
    },

    bindToForms: function (selector = "form") {
        document.querySelectorAll(selector).forEach((form) => {
            form.addEventListener("submit", () => this.save());
        });
    },
};
