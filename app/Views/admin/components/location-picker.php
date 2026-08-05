<?php

use App\Modules\Form;

$name = $name ?? 'location';
$value = $value ?? '';
$placeholder = $placeholder ?? 'София, Берлин, Лондон, Мелник...';
$label = $label ?? 'Град';
?>

<?php Form::input($label, $name, $value, 'text', [
    'placeholder' => $placeholder,
    'autocomplete' => 'off'
]); ?>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        const fieldName = <?= json_encode($name) ?>;
        const locationInput = document.querySelector(`input[name="${fieldName}"]`);
        if (!locationInput) return;

        const parentWrapper = locationInput.closest('div');
        if (parentWrapper) {
            parentWrapper.classList.add('relative');
        }

        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto divide-y divide-slate-100 hidden';
        locationInput.parentNode.insertBefore(suggestionsContainer, locationInput.nextSibling);

        function debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        }

        const searchLocation = async (query) => {
            if (query.length < 3) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('hidden');
                return;
            }

            suggestionsContainer.innerHTML = '<div class="p-3 text-sm text-slate-400 italic flex items-center gap-2"><i class="fa-solid fa-spinner animate-spin"></i> Търсене...</div>';
            suggestionsContainer.classList.remove('hidden');

            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&accept-language=bg&limit=10`;

                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) throw new Error('API Error');

                const data = await response.json();
                suggestionsContainer.innerHTML = '';

                const uniquePlaces = new Set();

                data.forEach(item => {
                    const addr = item.address;
                    if (!addr) return;

                    const settlement = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality;
                    const country = addr.country;

                    let cleanName = '';

                    if (settlement && country) {
                        if (settlement.toLowerCase() === country.toLowerCase()) {
                            cleanName = country;
                        } else {
                            cleanName = `${settlement}, ${country}`;
                        }
                    } else if (country && item.type === 'country') {
                        cleanName = country;
                    }

                    if (cleanName && !uniquePlaces.has(cleanName)) {
                        uniquePlaces.add(cleanName);

                        const row = document.createElement('button');
                        row.type = 'button';
                        row.className = 'w-full text-left p-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer';
                        row.innerHTML = `
                        <i class="fa-solid fa-location-dot text-slate-400 mt-0.5 shrink-0"></i>
                        <span class="truncate">${cleanName}</span>
                    `;

                        row.addEventListener('click', function () {
                            // Попълваме стойността в инпута
                            locationInput.value = cleanName;
                            
                            // Изпразваме контейнера и го скриваме, без да викамеdispatchEvent()
                            suggestionsContainer.innerHTML = '';
                            suggestionsContainer.classList.add('hidden');
                        });

                        suggestionsContainer.appendChild(row);
                    }
                });

                if (uniquePlaces.size === 0) {
                    suggestionsContainer.innerHTML = '<div class="p-3 text-sm text-slate-400 italic">Няма намерени градове или села</div>';
                }

            } catch (error) {
                console.error('Nominatim Error:', error);
                suggestionsContainer.innerHTML = '<div class="p-3 text-sm text-red-500 italic">Грешка при зареждане</div>';
            }
        };

        locationInput.addEventListener('input', debounce((e) => {
            searchLocation(e.target.value.trim());
        }, 400));

        document.addEventListener('click', function (e) {
            if (!locationInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.add('hidden');
            }
        });

        locationInput.addEventListener('focus', function () {
            if (locationInput.value.trim().length >= 3 && suggestionsContainer.children.length > 0) {
                suggestionsContainer.classList.remove('hidden');
            }
        });
    });
</script>