import { getWaterInfo, fetchWeatherData, fetchWaterStructures } from './api.js';
import { calculateIndicativeScore, generateZoneAdvice } from './advice.js';
import { setStatus, renderDashboard, renderOfflineFallback, saveStateToStorage } from './ui.js';

let map, markerGroup;
let requestDebounceTimer = null;
let lastClickedCoords = null;

document.addEventListener("DOMContentLoaded", () => {
    setStatus("Kaart initialiseren...");
    map = L.map('map').setView([52.0907, 5.1214], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    map.on('click', handleMapClick);
    map.on('moveend', handleMapMoveEnd);

    document.getElementById('species-select').addEventListener('change', refreshCurrentAnalysis);
    document.getElementById('season-select').addEventListener('change', refreshCurrentAnalysis);

    setStatus("Gereed. Klik op een willekeurig water in Nederland.");
});

function refreshCurrentAnalysis() {
    if (lastClickedCoords) {
        handleMapClick({ latlng: lastClickedCoords });
    }
}

async function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    lastClickedCoords = e.latlng;

    const dashboard = document.getElementById('dashboard-content');
    
    if (!navigator.onLine) {
        renderOfflineFallback(dashboard);
        return;
    }

    const species = document.getElementById('species-select').value;
    const season = document.getElementById('season-select').value;

    try {
        setStatus("Waterzone in Nederland zoeken...");
        dashboard.innerHTML = "⏳ Analyse uitvoeren voor gekozen vissoort & locatie...";

        const zone = await getWaterInfo(lat, lng);

        if (!zone.isNL) {
            setStatus("Locatie buiten Nederland.");
            dashboard.innerHTML = `
                <div class="warning-box">
                    ⚠️ Deze locatie ligt buiten Nederland. Deze applicatie ondersteunt alleen Nederlandse wateren.
                </div>
            `;
            return;
        }

        setStatus("Weerscore & adviezen berekenen...");
        const weather = await fetchWeatherData(lat, lng);
        const scoreData = calculateIndicativeScore(weather);
        const advices = generateZoneAdvice(zone, weather, species, season);

        saveStateToStorage({ zone, weather, scoreData, advices, species, season });

        renderDashboard(dashboard, zone, scoreData, weather, advices, lat, lng, species, season);
        setStatus("Gereed.");

    } catch (error) {
        console.error(error);
        setStatus("Fout bij ophalen gegevens.");
        dashboard.innerHTML = `
            <div class="warning-box">
                ❌ Fout bij ophalen gegevens (${error.message}).<br>
                <button class="retry-btn" onclick="location.reload()">Opnieuw proberen</button>
            </div>
        `;
    }
}

function handleMapMoveEnd() {
    clearTimeout(requestDebounceTimer);
    requestDebounceTimer = setTimeout(async () => {
        const zoom = map.getZoom();
        if (zoom < 14) {
            markerGroup.clearLayers();
            setStatus("Inzoomen om structuren te zien (zoom >= 14)");
            return;
        }
        
        try {
            setStatus("Potentiële structuren laden...");
            const data = await fetchWaterStructures(map.getBounds());
            
            markerGroup.clearLayers();
            const clusters = {};

            data.elements.forEach(el => {
                const lat = el.lat || (el.center && el.center.lat);
                const lon = el.lon || (el.center && el.center.lon);
                if (!lat || !lon) return;

                const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
                if (!clusters[key]) {
                    clusters[key] = { lat, lon, count: 0, types: new Set() };
                }
                clusters[key].count++;
                clusters[key].types.add(el.tags.bridge ? "Brug" : "Stuw");
            });

            Object.values(clusters).forEach(c => {
                const marker = L.circleMarker([c.lat, c.lon], {
                    radius: Math.min(6 + c.count, 12),
                    fillColor: "#fb923c",
                    color: "#ffffff",
                    weight: 1,
                    fillOpacity: 0.8
                });
                marker.bindPopup(`<b>Potentiële structuur (${Array.from(c.types).join(', ')})</b><br>Aantal in cluster: ${c.count}`);
                markerGroup.addLayer(marker);
            });

            setStatus("Gereed.");

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn("Fout bij laden structuren:", err);
                setStatus("Fout bij laden structuren.");
            }
        }
    }, 400);
}
