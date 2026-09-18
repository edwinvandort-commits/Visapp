import { speciesData, getSolunarData, calculateWaterTemp, getSpeciesEcoRules } from './advice.js';

export function setupUI(onCategoryChange, onSpeciesChange) {
    // Nachtstand toggle
    const nightBtn = document.getElementById('btn-night');
    if (nightBtn) {
        nightBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    // Categorie knoppen
    document.querySelectorAll('.btn-cat').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const catKey = btn.dataset.cat;
            renderSpeciesButtons(catKey, onSpeciesChange);
            onCategoryChange(catKey);
        });
    });

    // Dashboard Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.tab;
            const targetEl = document.getElementById(`tab-${target}`);
            if (targetEl) targetEl.classList.add('active');
        });
    });

    // Laad standaard eerste categorie (Roofvis)
    renderSpeciesButtons('roofvis', onSpeciesChange);
}

export function renderSpeciesButtons(catKey, onSpeciesChange) {
    const speciesPanel = document.getElementById('sub-species-panel');
    if (!speciesPanel) return;

    speciesPanel.innerHTML = '';
    const list = speciesData[catKey] || [];

    list.forEach((fish, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-species' + (index === 0 ? ' active' : '');
        btn.innerText = fish.name;
        btn.onclick = () => {
            document.querySelectorAll('.btn-species').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onSpeciesChange(fish);
        };
        speciesPanel.appendChild(btn);
    });

    if (list.length > 0) {
        onSpeciesChange(list[0]);
    }
}

export function updateDashboardUI(fish, waterChar, tidalInfo, weatherData, season) {
    const solunar = getSolunarData();
    const airTemp = weatherData ? weatherData.temp : 15;
    const waterTemp = calculateWaterTemp(airTemp, season);
    const ecoRules = getSpeciesEcoRules(fish.key || fish.name.toLowerCase(), season);

    // Titel
    const titleEl = document.getElementById('fish-title');
    if (titleEl) titleEl.innerText = `Visadvies: ${fish.name}`;

    // 1. Advies & Aas
    const tackleEl = document.getElementById('tackle-info');
    if (tackleEl) tackleEl.innerText = fish.tackle;

    const hotspotEl = document.getElementById('hotspot-info');
    if (hotspotEl) hotspotEl.innerText = `${fish.hotspot} (Richtinggevende diepte: ${fish.depth})`;

    // 2. Hydrografie & Watertemperatuur
    const hydroEl = document.getElementById('hydro-info');
    if (hydroEl) {
        hydroEl.innerHTML = `
            • <b>Type:</b> ${waterChar.category} (${tidalInfo.waterType})<br>
            • <b>Indicatieve Diepte:</b> ${waterChar.depth}<br>
            • <b>Bodemprofiel:</b> ${waterChar.profile}
        `;
    }

    const tidalEl = document.getElementById('tidal-info');
    if (tidalEl) {
        if (tidalInfo.isTidal) {
            tidalEl.style.display = 'block';
            tidalEl.innerHTML = `<strong>🌊 Getijdenzone:</strong> ${tidalInfo.tip}`;
        } else {
            tidalEl.style.display = 'none';
        }
    }

    const tempEl = document.getElementById('water-temp-info');
    if (tempEl) {
        tempEl.innerHTML = `
            • <b>Lucht / Geschat Water:</b> ${airTemp}°C / <b>${waterTemp.estimatedWaterTemp}°C</b><br>
            • <b>Zuurstofgehalte:</b> ${waterTemp.oxygenStatus}
        `;
    }

    // 3. Solunar & Ecologie
    const solunarEl = document.getElementById('solunar-info');
    if (solunarEl) {
        solunarEl.innerHTML = `
            • <b>Maanfase:</b> ${solunar.phaseName} (Dag ${solunar.moonAgeDays})<br>
            • <b>Piekuren:</b> ${solunar.majorPeriods}<br>
            • <b>Aasactiviteit Bonus:</b> +${solunar.scoreBonus}%
        `;
    }

    const ecoEl = document.getElementById('eco-info');
    if (ecoEl) {
        let warningText = ecoRules.warning ? `<p class="warning-text">${ecoRules.warning}</p>` : '';
        ecoEl.innerHTML = `
            ${warningText}
            • <b>Minimale maat:</b> ${fish.min}<br>
            • <b>Gesloten tijd:</b> ${fish.closed}<br>
            • <b>Ethisch advies:</b> ${ecoRules.ethicsTip}
        `;
    }
}
