const STORAGE_KEY = "smartwater_last_state";
let map, markerGroup;
let overpassAbortController = null;
let requestDebounceTimer = null;

// ==========================================
// 1. INITIALISATIE KAART
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    map = L.map('map').setView([52.0907, 5.1214], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    map.on('click', handleMapClick);
    map.on('moveend', handleMapMoveEnd);
});

// ==========================================
// 2. DYNAMISCHE WATERLOOKUP VOOR HEEL NL
// ==========================================
async function getWaterInfo(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    
    const response = await fetch(url, {
        headers: { 'User-Agent': 'SmartWaterNL-App' }
    });
    
    if (!response.ok) throw new Error("Locatie niet gevonden");
    const data = await response.json();
    const addr = data.address || {};

    // Controleer of de locatie in Nederland ligt
    if (addr.country_code !== 'nl') {
        return { isNL: false };
    }

    // Bepaal de waternaam (pakt water, rivier, kanaal, of plaatsnaam als fallback)
    const waterName = data.namedetails?.name || 
                      addr.natural || 
                      addr.waterway || 
                      addr.water || 
                      addr.suburb || 
                      addr.city_district || 
                      addr.town || 
                      addr.village || 
                      "Nederlands Binnenwater";

    const waterType = addr.waterway || addr.natural || "binnenwater";

    return {
        isNL: true,
        id: `nl-${lat.toFixed(3)}-${lng.toFixed(3)}`,
        name: waterName,
        type: waterType,
        depth: "1.0 - 3.0m (indicatief)",
        distanceMeters: 0
    };
}

// ==========================================
// 3. WEER & DRUKTREND
// ==========================================
async function fetchWeatherData(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,surface_pressure&hourly=surface_pressure&forecast_days=2`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weer-API niet bereikbaar");
    const data = await response.json();

    const current = data.current;
    const hourly = data.hourly;
    
    let pressureTrend = null;
    if (hourly && hourly.surface_pressure && hourly.time) {
        const nowTime = new Date(current.time).getTime();
        const findPressureHoursAgo = (hours) => {
            const targetTime = nowTime - (hours * 3600 * 1000);
            const idx = hourly.time.findIndex(t => Math.abs(new Date(t).getTime() - targetTime) < 1800000);
            return idx !== -1 ? hourly.surface_pressure[idx] : null;
        };

        const p3 = findPressureHoursAgo(3);
        const p6 = findPressureHoursAgo(6);
        const p12 = findPressureHoursAgo(12);

        if (p3 !== null && p6 !== null && p12 !== null) {
            const diff3 = current.surface_pressure - p3;
            pressureTrend = {
                now: current.surface_pressure,
                p3, p6, p12,
                diff3: diff3.toFixed(1)
            };
        }
    }

    return {
        temperature: current.temperature_2m,
        windSpeed: current.wind_speed_10m,
        pressure: current.surface_pressure,
        pressureTrend
    };
}

function calculateIndicativeScore(weatherData) {
    let components = 0;
    let totalScore = 0;
    const breakdown = {};

    if (weatherData.temperature !== undefined) {
        components++;
        const tempScore = Math.max(0, Math.min(100, 100 - Math.abs(16 - weatherData.temperature) * 5));
        breakdown.temperature = Math.round(tempScore);
        totalScore += tempScore;
    }

    if (weatherData.windSpeed !== undefined) {
        components++;
        const windScore = Math.max(0, Math.min(100, 100 - (weatherData.windSpeed * 2)));
        breakdown.wind = Math.round(windScore);
        totalScore += windScore;
    }

    if (weatherData.pressureTrend) {
        components++;
        const diff = Math.abs(weatherData.pressureTrend.diff3);
        const pressureScore = Math.max(0, Math.min(100, 100 - (diff * 15)));
        breakdown.pressure = Math.round(pressureScore);
        totalScore += pressureScore;
    } else {
        breakdown.pressure = "druktrend niet beschikbaar — niet meegerekend";
    }

    breakdown.depth = "waterdiepte niet beschikbaar";

    const finalScore = components > 0 ? Math.round(totalScore / components) : null;

    return {
        availableComponents: `${components} van 4 componenten`,
        finalScore,
        breakdown
    };
}

// ==========================================
// 4. ADVIEZEN GENEREREN
// ==========================================
function generateZoneAdvice(zone, weather) {
    return [
        {
            title: "Waar letten?",
            text: `Focus op bruggen, steigers of rietranden nabij ${zone.name}. Zoek naar stroomonderbrekingen of diepteovergangen.`
        },
        {
            title: "Waarom?",
            text: `Temperatuur is ${weather.temperature}°C met windkracht ${weather.windSpeed} km/u.` + 
                  (weather.pressureTrend ? ` Luchtdruk verandering (laatste 3u): ${weather.pressureTrend.diff3} hPa.` : "")
        },
        {
            title: "Hoe vissen?",
            text: `Viskolom: ${zone.depth}. Aanbevolen techniek: actief afvissen met licht kunstaas of natuurlijke aaspresentatie op de structuurranden.`
        }
    ];
}

// ==========================================
// 5. MAP CLICK & OFFLINE FALLBACK
// ==========================================
async function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    const dashboard = document.getElementById('dashboard-content');
    dashboard.innerHTML = "⏳ Waterzone in Nederland zoeken...";

    if (!navigator.onLine) {
        renderOfflineFallback(dashboard);
        return;
    }

    try {
        const zone = await getWaterInfo(lat, lng);

        if (!zone.isNL) {
            dashboard.innerHTML = `
                <div class="warning-box">
                    ⚠️ Deze locatie ligt buiten Nederland. Deze applicatie ondersteunt alleen Nederlandse wateren.
                </div>
            `;
            return;
        }

        dashboard.innerHTML = "⏳ Indicatieve weerscore berekenen...";
        const weather = await fetchWeatherData(lat, lng);
        const scoreData = calculateIndicativeScore(weather);
        const advices = generateZoneAdvice(zone, weather);

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            zone, weather, scoreData, advices, timestamp: new Date().toISOString()
        }));

        renderDashboard(dashboard, zone, scoreData, advices, lat, lng);

    } catch (error) {
        console.error(error);
        dashboard.innerHTML = `
            <div class="warning-box">
                ❌ Fout bij ophalen gegevens (${error.message}).<br>
                <button class="retry-btn" onclick="location.reload()">Opnieuw proberen</button>
            </div>
        `;
    }
}

function renderDashboard(container, zone, scoreData, advices, lat, lng) {
    const visplannerUrl = `https://www.visplanner.nl/?lat=${lat}&lng=${lng}`;

    let html = `
        <h3 style="margin:0 0 6px 0;">📍 ${zone.name}</h3>
        
        <a href="${visplannerUrl}" target="_blank" style="display:inline-block; margin-bottom:10px; padding:6px 10px; background:#2980b9; color:white; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold;">
            📱 Check Juridische Status in VISplanner ➔
        </a>

        <div class="advice-card">
            <strong>📊 Indicatieve weerscore: ${scoreData.finalScore !== null ? scoreData.finalScore : 'N/B'}</strong>
            <div class="score-breakdown">
                <small>Beschikbaar: ${scoreData.availableComponents}</small><br>
                • Temperatuur: ${scoreData.breakdown.temperature ?? 'N/B'}<br>
                • Wind: ${scoreData.breakdown.wind ?? 'N/B'}<br>
                • Druktrend: ${typeof scoreData.breakdown.pressure === 'number' ? scoreData.breakdown.pressure : scoreData.breakdown.pressure}<br>
                • Diepte: ${scoreData.breakdown.depth}
            </div>
        </div>
    `;

    advices.forEach(adv => {
        html += `
            <div class="advice-card">
                <strong>${adv.title}</strong>
                <p style="margin:4px 0 0 0; font-size:13px;">${adv.text}</p>
                <span class="badge" style="margin-top:6px; display:inline-block; color:#fb923c;">Indicatief — geen bewezen vangstplek</span>
            </div>
        `;
    });

    html += `<p style="font-size:11px; color:#94a3b8; margin-top:10px;">Visrecht status: <i>Visrecht niet vastgesteld door Visapp</i></p>`;

    container.innerHTML = html;
}

function renderOfflineFallback(container) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        container.innerHTML = `
            <div class="warning-box">
                📡 Offline — Geen netwerkverbinding en geen eerder opgeslagen gegevens beschikbaar.
            </div>
        `;
        return;
    }
    const last = JSON.parse(raw);
    container.innerHTML = `
        <div class="warning-box" style="background:#3b2d11; border-color:#854d0e; color:#fef08a;">
            ⚠️ Offline — laatst bekende indicatieve informatie wordt gebruikt. Live data ontbreekt.<br>
            <small>Opgeslagen op: ${new Date(last.timestamp).toLocaleString()}</small>
        </div>
    `;
    renderDashboard(container, last.zone, last.scoreData, last.advices, last.zone.latitude || 52.09, last.zone.longitude || 5.12);
}

// ==========================================
// 6. ZOOM & CLUSTERING STRUCTUREN
// ==========================================
function handleMapMoveEnd() {
    clearTimeout(requestDebounceTimer);
    requestDebounceTimer = setTimeout(() => {
        const zoom = map.getZoom();
        if (zoom < 14) {
            markerGroup.clearLayers();
            return;
        }
        fetchMapStructures();
    }, 400);
}

async function fetchMapStructures() {
    if (overpassAbortController) {
        overpassAbortController.abort();
    }
    overpassAbortController = new AbortController();

    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

    const query = `[out:json][timeout:10];
        (
          node["bridge"](${bbox});
          way["bridge"](${bbox});
          node["waterway"="weir"](${bbox});
        );
        out center;`;

    try {
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
            signal: overpassAbortController.signal
        });
        if (!response.ok) return;
        const data = await response.json();

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

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.warn("Fout bij laden structuren:", err);
        }
    }
}
