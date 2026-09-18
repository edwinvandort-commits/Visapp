// js/ui.js
import { speciesData, getSolunarData, calculateWaterTemp, getSpeciesEcoRules, getCurrentSeason } from './advice.js';

export function setupUI(onCategoryChange, onSpeciesChange, onSearch) {
    // Nachtstand toggle
    const nightBtn = document.getElementById('btn-night');
    if (nightBtn) {
        nightBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    // Zoekbalk event
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => onSearch(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') onSearch(searchInput.value);
        });
    }

    // Categorie knoppen
    document.querySelectorAll('.btn-cat').forEach(btn => {
        btn.addEventListener('click', (e) => {
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

/**
 * Rendert het complete Fase 2 advies op het dashboard
 */
export function updateDashboardUI(fish, waterChar, tidalInfo, weatherData) {
    const season = getCurrentSeason();
    const solunar = getSolunarData();
    const waterTemp = calculateWaterTemp(weatherData.temp, season);
    const ecoRules = getSpeciesEcoRules(fish.key || fish.name.toLowerCase(), season);

    // Dynamic Title
    const titleEl = document.getElementById('fish-title');
    if (titleEl) titleEl.innerText = `Advies: ${fish.name}`;

    // 1. Hydrografie & Watertype
    const hydroEl = document.getElementById('hydro-info');
    if (hydroEl) {
        hydroEl.innerHTML = `
            • <b>Type:</b> ${waterChar.category} (${tidalInfo.waterType})<br>
            • <b>Indicatieve Diepte:</b> ${waterChar.depth}<br>
            • <b>Bodemprofiel:</b> ${waterChar.profile}
        `;
    }

    // 2. Solunaire & Astronomische Piekuren
    const solunarEl = document.getElementById('solunar-info');
    if (solunarEl) {
        solunarEl.innerHTML = `
            • <b>Maanfase:</b> ${solunar.phaseName} (Dag ${solunar.moonAgeDays})<br>
            • <b>Piekuren:</b> ${solunar.majorPeriods}<br>
            • <b>Aasactiviteit Bonus:</b> +${solunar.scoreBonus}%
        `;
    }

    // 3. Getijden & Estuarium
    const tidalEl = document.getElementById('tidal-info');
    if (tidalEl) {
        if (tidalInfo.isTidal) {
            tidalEl.style.display = 'block';
            tidalEl.innerHTML = `<strong>🌊 Getijdenzone:</strong> ${tidalInfo.tip}`;
        } else {
            tidalEl.style.display = 'none';
        }
    }

    // 4. Watertemperatuur & Zuurstof
    const tempEl = document.getElementById('water-temp-info');
    if (tempEl) {
        tempEl.innerHTML = `
            • <b>Lucht / Geschat Water:</b> ${weatherData.temp}°C / <b>${waterTemp.estimatedWaterTemp}°C</b><br>
            • <b>Zuurstofgehalte:</b> ${waterTemp.oxygenStatus}
        `;
    }

    // 5. Seizoen, Paaitijden & Ethisch Advies
    const ecoEl = document.getElementById('eco-info');
    if (ecoEl) {
        let warningText = ecoRules.warning ? `<p style="color:#d35400; font-weight:bold; margin:2px 0;">${ecoRules.warning}</p>` : '';
        ecoEl.innerHTML = `
            ${warningText}
            • <b>Minimale maat:</b> ${fish.min}<br>
            • <b>Gesloten tijd:</b> ${fish.closed}<br>
            • <b>Ethisch advies:</b> ${ecoRules.ethicsTip}
        `;
    }

    // Aas & Hotspots
    const tackleEl = document.getElementById('tackle-info');
    if (tackleEl) tackleEl.innerText = fish.tackle;

    const hotspotEl = document.getElementById('hotspot-info');
    if (hotspotEl) hotspotEl.innerText = fish.hotspot;
}
