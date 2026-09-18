const STORAGE_KEY = "smartwater_last_state";
let map, markerGroup;
let overpassAbortController = null;
let requestDebounceTimer = null;
let lastClickedCoords = null;

function setStatus(text) {
    const el = document.getElementById('status-bar');
    if (el) el.innerText = `Status: ${text}`;
}

// ==========================================
// 1. INITIALISATIE KAART & CONTROLS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    setStatus("Kaart initialiseren...");
    map = L.map('map').setView([52.0907, 5.1214], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    map.on('click', handleMapClick);
    map.on('moveend', handleMapMoveEnd);

    // Herbereken advies direct wanneer gebruiker vissoort of seizoen aanpast
    document.getElementById('species-select').addEventListener('change', refreshCurrentAnalysis);
    document.getElementById('season-select').addEventListener('change', refreshCurrentAnalysis);

    setStatus("Gereed. Klik op een willekeurig water in Nederland.");
});

function refreshCurrentAnalysis() {
    if (lastClickedCoords) {
        handleMapClick({ latlng: lastClickedCoords });
    }
}

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

    if (addr.country_code !== 'nl') {
        return { isNL: false };
    }

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
        depth: "1.0 - 3.5m (indicatief)",
        distanceMeters: 0
    };
}

// ==========================================
// 3. WEER & DRUKTREND
// ==========================================
async function fetchWeatherData(lat, lng) {
    setStatus("Weer-API raadplegen...");
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
            pressureTrend = {
                now: current.surface_pressure,
                p3, p6, p12,
                diff3: (current.surface_pressure - p3).toFixed(1),
                diff6: (current.surface_pressure - p6).toFixed(1),
                diff12: (current.surface_pressure - p12).toFixed(1)
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
        breakdown.pressure = "Druktrend niet beschikbaar — niet meegerekend";
    }

    const finalScore = components > 0 ? Math.round(totalScore / components) : null;

    return {
        availableComponents: `${components} van 4 componenten`,
        finalScore,
        breakdown
    };
}

// ==========================================
// 4. DRIE DYNAMISCHE CONCRETE ADVIEZEN (STAP 10)
// ==========================================
function generateZoneAdvice(zone, weather, species, season) {
    let whereText = "";
    let whyText = "";
    let howText = "";

    // 1. Waar letten? (Gekoppeld aan vissoort, water en seizoen)
    if (species === "snoekbaars") {
        whereText = season === "winter" || season === "herfst" ?
            `Zoek de diepere vaargeulen, bruggen en havenmondingen nabij ${zone.name}. Snoekbaars trekt bij koud weer naar dieper, rustiger water.` :
            `Focus op schaduwrijke stroomnaden, palenreeksen en steigers van ${zone.name}. In de warmere maanden jagen ze op lavende vis nabij de kant.`;
    } else if (species === "snoek") {
        whereText = `Zoek rietkragen, lelievelden, gemaaluitstroom en bruggen rond ${zone.name}. Snoek zoekt beschutting en luwte van waaruit hij kan toeslaan.`;
    } else if (species === "baars") {
        whereText = `Inspecteer harde bodems, damwanden, steigers en brugpijlers bij ${zone.name}. Baars houdt zich graag op rond harde structuren.`;
    } else if (species === "karper") {
        whereText = season === "voorjaar" ?
            `Zoek de ondiepe, snel opwarmende zones en rietbochten bij ${zone.name}.` :
            `Zoek kuilen, taluds en luwe hoeken van ${zone.name} waar natuurlijk voedsel ophoopt.`;
    } else {
        whereText = `Focus op stroomluwe plekken, voerplekken en brugschaduwen langs ${zone.name}.`;
    }

    // 2. Waarom? (Gekoppeld aan weer, seizoen en luchtdruk)
    const trendText = weather.pressureTrend ?
        `Luchtdruk nu is ${weather.pressureTrend.now} hPa met een 3-uurs verandering van ${weather.pressureTrend.diff3} hPa.` :
        `Luchtdruktrend is niet beschikbaar.`;

    whyText = `Het is momenteel ${season} met een luchttemperatuur van ${weather.temperature}°C en windkracht ${weather.windSpeed} km/u. ${trendText} `;
    
    if (weather.temperature < 8) {
        whyText += `Lage temperaturen vertragen de stofwisseling van de ${species}, wat vraagt om een erg trage presentatie.`;
    } else if (weather.pressureTrend && Math.abs(weather.pressureTrend.diff3) > 3) {
        whyText += `Snelle luchtdrukveranderingen maken vis passiever; zoek de vis strak tegen het bodemoppervlak of in de luwte.`;
    } else {
        whyText += `Stabiele omstandigheden verhogen de kans dat ${species} actief op zoek gaat naar voedsel.`;
    }

    // 3. Hoe vissen? (Techniek, diepte en aasadvies per vissoort)
    if (species === "snoekbaars") {
        howText = `Indicatieve diepte: ${zone.depth}. Aanbevolen techniek: Diagonaal of vertikaal jiggend met een 7-10cm softbait (shads) met een lichte loodkop. Vislijn strak houden tijdens de afzinkfase!`;
    } else if (species === "snoek") {
        howText = `Indicatieve diepte: ${zone.depth}. Aanbevolen techniek: Werpend vissen met groter kunstaas (swimbaits, spinnertails of pluggen van 12-20cm) óf statisch vissen met dood aas onder een dobber.`;
    } else if (species === "baars") {
        howText = `Indicatieve diepte: ${zone.depth}. Aanbevolen techniek: Carolina-rig of Dropshot met kleine creature baits (5-8cm), of kleine spintail spinners bij actieve vis.`;
    } else if (species === "karper") {
        howText = `Indicatieve diepte: ${zone.depth}. Aanbevolen techniek: Statische montage met boilies/mais op een hair-rig, of subtiel vissen met een pennetje op een voerstee.`;
    } else {
        howText = `Indicatieve diepte: ${zone.depth}. Aanbevolen techniek: Feederhengel met een korfje of licht pennen met maden/casters.`;
    }

    return [
        { title: `Where: Waar letten? (${species})`, text: whereText },
        { title: `Why: Waarom? (${season} / Weer)`, text: whyText },
        { title: `How: Hoe vissen? (Techniek & Aas)`, text: howText }
    ];
}

// ==========================================
// 5. MAP CLICK & DASHBOARD RENDER
// ==========================================
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

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            zone, weather, scoreData, advices, species, season, timestamp: new Date().toISOString()
        }));

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

function renderDashboard(container, zone, scoreData, weather, advices, lat, lng, species, season) {
    const visplannerUrl = `https://www.visplanner.nl/?lat=${lat}&lng=${lng}`;

    let pressureDetails = weather.pressureTrend ? 
        `Nu: ${weather.pressureTrend.now} hPa | -3u: ${weather.pressureTrend.p3} hPa (${weather.pressureTrend.diff3}) | -6u: ${weather.pressureTrend.p6} hPa (${weather.pressureTrend.diff6}) | -12u: ${weather.pressureTrend.p12} hPa (${weather.pressureTrend.diff12})` : 
        "Druktrend niet beschikbaar — niet meegerekend";

    let html = `
        <h3 style="margin:0 0 6px 0;">📍 ${zone.name} <span class="badge" style="text-transform:capitalize;">${species} • ${season}</span></h3>
        
        <a href="${visplannerUrl}" target="_blank" style="display:inline-block; margin-bottom:10px; padding:6px 10px; background:#2980b9; color:white; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold;">
            📱 Check Juridische Status in VISplanner ➔
        </a>

        <div class="advice-card">
            <strong>📊 Indicatieve weerscore: ${scoreData.finalScore !== null ? scoreData.finalScore : 'N/B'}</strong>
            <div class="score-breakdown">
                <strong>Beschikbaar: ${scoreData.availableComponents}</strong><br>
                • Temperatuur: ${scoreData.breakdown.temperature ?? 'N/B'}<br>
                • Wind: ${scoreData.breakdown.wind ?? 'N/B'}<br>
                • Druktrend score: ${scoreData.breakdown.pressure}<br>
                <small style="color:#94a3b8;">Drukverloop: ${pressureDetails}</small>
                
                <div class="unavailable-list">
                    ❌ <b>Niet beschikbaar / Niet meegerekend:</b><br>
                    Watertemperatuur • Stromingssnelheid • Waterdoorzicht • Officiële diepte • Vangstdata • Regelgeving
                </div>
            </div>
        </div>
    `;

    // Elk van de 3 adviesblokken krijgt nu expliciet het oranje label
    advices.forEach(adv => {
        html += `
            <div class="advice-card">
                <strong>${adv.title}</strong>
                <p style="margin:6px 0 8px 0; font-size:13px; line-height:1.5;">${adv.text}</p>
                <span class="badge badge-orange">Indicatief — geen bewezen vangstplek</span>
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
    setStatus("Offline data geladen.");
    container.innerHTML = `
        <div class="warning-box" style="background:#3b2d11; border-color:#854d0e; color:#fef08a;">
            ⚠️ Offline — laatst bekende indicatieve informatie wordt gebruikt. Live data ontbreekt.<br>
            <small>Opgeslagen op: ${new Date(last.timestamp).toLocaleString()}</small>
        </div>
    `;
    renderDashboard(container, last.zone, last.scoreData, last.weather, last.advices, last.zone.latitude || 52.09, last.zone.longitude || 5.12, last.species || "snoekbaars", last.season || "herfst");
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
            setStatus("Inzoomen om structuren te zien (zoom >= 14)");
            return;
        }
        fetchMapStructures();
    }, 400);
}

async function fetchMapStructures() {
    if (overpassAbortController) overpassAbortController.abort();
    overpassAbortController = new AbortController();

    setStatus("Potentiële structuren laden...");
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

        setStatus("Gereed.");

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.warn("Fout bij laden structuren:", err);
            setStatus("Fout bij laden structuren.");
        }
    }
}
