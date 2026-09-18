const STORAGE_KEY = "smartwater_last_state";

export function setStatus(text) {
    const el = document.getElementById('status-bar');
    if (el) el.innerText = `Status: ${text}`;
}

export function renderDashboard(container, zone, scoreData, weather, advices, lat, lng, species, season) {
    const visplannerUrl = `https://www.visplanner.nl/?lat=${lat}&lng=${lng}`;

    let pressureDetails = weather.pressureTrend ? 
        `Nu: ${weather.pressureTrend.now} hPa | -3u: ${weather.pressureTrend.p3} hPa (${weather.pressureTrend.diff3}) | -6u: ${weather.pressureTrend.p6} hPa (${weather.pressureTrend.diff6}) | -12u: ${weather.pressureTrend.p12} hPa (${weather.pressureTrend.diff12})` : 
        "Druktrend niet beschikbaar — niet meegerekend";

    let html = `
        <h3 style="margin:0 0 6px 0;">📍 ${zone.name} <span class="badge">${species} • ${season}</span></h3>
        
        <a href="${visplannerUrl}" target="_blank" class="visplanner-btn">
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

export function renderOfflineFallback(container) {
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
        <div class="warning-box warning-box-offline">
            ⚠️ Offline — laatst bekende indicatieve informatie wordt gebruikt. Live data ontbreekt.<br>
            <small>Opgeslagen op: ${new Date(last.timestamp).toLocaleString()}</small>
        </div>
    `;
    renderDashboard(
        container, 
        last.zone, 
        last.scoreData, 
        last.weather, 
        last.advices, 
        last.zone.latitude || 52.09, 
        last.zone.longitude || 5.12, 
        last.species || "snoekbaars", 
        last.season || "herfst"
    );
}

export function saveStateToStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
    }));
}
