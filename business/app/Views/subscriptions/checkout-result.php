<section class="mx-auto max-w-xl px-5 py-20 text-center">
    <div id="status-icon" class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-600">
        <i class="fa-solid fa-spinner fa-spin"></i>
    </div>
    <h1 id="status-title" class="mt-6 text-3xl font-black text-slate-900">Потвърждаваме абонамента</h1>
    <p id="status-message" class="mt-3 text-slate-600">
        Изчакваме защитеното потвърждение от Stripe. Не затваряйте страницата.
    </p>
    <a id="return-button" href="#" class="mt-8 hidden rounded-xl bg-primary px-6 py-3 font-bold text-white">
        Връщане в „Ето ме“
    </a>
</section>

<script>
(function () {
    const sessionId = <?= json_encode($sessionId, JSON_UNESCAPED_SLASHES) ?>;
    const checkout = <?= json_encode($checkout, JSON_UNESCAPED_SLASHES) ?>;
    let attempts = 0;

    async function checkStatus() {
        attempts += 1;
        try {
            const response = await fetch('/subscriptions/status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                body: JSON.stringify({session_id: sessionId, checkout: checkout})
            });
            const payload = await response.json();
            if (payload.success && payload.data.completed) {
                const url = payload.data.return_url;
                document.getElementById('status-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
                document.getElementById('status-icon').className = 'mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600';
                document.getElementById('status-title').textContent = 'Платеният план е активиран';
                document.getElementById('status-message').textContent = 'Плащането е потвърдено. Връщаме ви в приложението.';
                const button = document.getElementById('return-button');
                button.href = url;
                button.classList.remove('hidden');
                window.location.href = url;
                return;
            }
        } catch (_) {}

        if (attempts < 30) {
            setTimeout(checkStatus, 2000);
        } else {
            document.getElementById('status-title').textContent = 'Потвърждението се забавя';
            document.getElementById('status-message').textContent = 'Проверете плана си в приложението след малко. Не извършвайте второ плащане.';
            const button = document.getElementById('return-button');
            button.href = 'chatapp://subscription-result?status=pending';
            button.classList.remove('hidden');
        }
    }

    checkStatus();
})();
</script>

