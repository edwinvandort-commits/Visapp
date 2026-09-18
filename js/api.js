let overpassAbortController = null;

/**
 * Haalt waterinformatie op van OpenStreetMap voor een specifieke GPS-locatie.
 */
export async function getWaterInfo(lat, lng) {
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
        distanceMeters: 0,
        latitude: lat,
        longitude: lng
    };
}

/**
 * Haalt weer- en luchtdrukdata op van Open-Meteo op basis van coördinaten.
 */
export async function fetchWeatherData(lat, lng) {
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

/**
 * Haalt waterstructuren (bruggen en stuwen) op van Overpass API binnen de kaartgrenzen.
 */
export async function fetchWaterStructures(bounds) {
    if (overpassAbortController) overpassAbortController.abort();
    overpassAbortController = new AbortController();

    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    const query = `[out:json][timeout:10];
        (
          node["bridge"](${bbox});
          way["bridge"](${bbox});
          node["waterway"="weir"](${bbox});
        );
        out center;`;

    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
        signal: overpassAbortController.signal
    });
    
    if (!response.ok) throw new Error("Structuur-API niet bereikbaar");
    return await response.json();
}
