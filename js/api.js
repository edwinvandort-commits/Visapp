// js/api.js

/**
 * Zoekt locaties op via Nominatim
 */
export async function searchLocation(query) {
    if (!query) return null;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=nl&q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Netwerkfout bij zoeken");
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                name: data[0].display_name.split(',')[0],
                fullName: data[0].display_name,
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (err) {
        console.error("Zoekfout:", err);
        return null;
    }
}

/**
 * Punt 1: Geavanceerde Watertype-classificatie & Hydrografie
 */
export function getWaterCharacteristics(waterType, waterName) {
    const nameLower = (waterName || "").toLowerCase();
    const typeLower = (waterType || "").toLowerCase();

    if (nameLower.includes("kanaal") || typeLower === "canal") {
        return {
            category: "Kanaal",
            depth: "2.5m - 5.0m",
            profile: "Strakke taluds, steenstort op de kanten, constante diepte in de vaargeul.",
            tempSensitivity: "Gemiddeld",
            oxygenLevel: "Goed (door scheepvaart en spuiing)"
        };
    } else if (nameLower.includes("plas") || nameLower.includes("meer") || nameLower.includes("kolk") || typeLower === "water") {
        return {
            category: "Plas / Zandafgraving",
            depth: "3.0m - 15.0m+",
            profile: "Steile taluds, diepe kuilen, ondiepe platen en thermocline (spronglaag) in de zomer.",
            tempSensitivity: "Laag (warmt langzaam op, koelt langzaam af)",
            oxygenLevel: "Seizoensafhankelijk (risico op zuurstofarm diep water in hoogzomer)"
        };
    } else if (nameLower.includes("polder") || nameLower.includes("wetering") || nameLower.includes("gracht") || typeLower === "ditch" || typeLower === "drain") {
        return {
            category: "Polder / Wetering",
            depth: "0.8m - 1.8m",
            profile: "Ondiep, drassige zachte bodem, dichte waterplanten- en rietkragen.",
            tempSensitivity: "Zeer hoog (reageert direct op zon en nachtvorst)",
            oxygenLevel: "Gevoelig voor stilstaand warm water"
        };
    } else if (nameLower.includes("rivier") || typeLower === "river") {
        return {
            category: "Grote Rivier",
            depth: "2.0m - 8.0m (Kribben & Vaargeul)",
            profile: "Kribvakken, stroomnaden, diepe uitgesleten kolken achter kribkoppen.",
            tempSensitivity: "Gemiddeld (sterke invloed van bovenwater/stroming)",
            oxygenLevel: "Zeer goed (continu zuurstofrijk door stroming)"
        };
    }

    return {
        category: "Binnenwater",
        depth: "1.0m - 3.5m",
        profile: "Standaard binnenwater met geleidelijk aflopende oever/talud.",
        tempSensitivity: "Gemiddeld",
        oxygenLevel: "Normaal"
    };
}

/**
 * Punt 3: Getijden & Estuarium-Indicatie (Zout / Brak Water)
 */
export function checkTidalZone(lat, lng) {
    // Coördinatenkader voor Zeeland, Waddenzee, Rotterdam/Nieuwe Waterweg, Haringvliet, IJmuiden
    const isCoastal = (lat > 51.3 && lat < 53.6 && lng > 3.3 && lng < 7.2);
    const isWestCoast = lng < 4.8 || lat > 52.8;

    if (isCoastal && isWestCoast) {
        return {
            isTidal: true,
            waterType: "Brak / Zout Estuarium",
            tip: "Houd rekening met getijdewerking (Eb & Vloed). Stromend water activeert roofvis zoals Zeebaars en Bot!"
        };
    }
    return {
        isTidal: false,
        waterType: "Zoet Water",
        tip: ""
    };
}

/**
 * Haalt actuele weer- en historische temperatuurdata op via Open-Meteo
 */
export async function getWeatherData(lat, lng) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weer API fout");
        const data = await res.json();
        
        return {
            temp: data.current.temperature_2m,
            pressure: data.current.surface_pressure,
            windSpeed: data.current.wind_speed_10m,
            windDir: data.current.wind_direction_10m,
            weatherCode: data.current.weather_code,
            dailyMax: data.daily.temperature_2m_max[0],
            dailyMin: data.daily.temperature_2m_min[0]
        };
    } catch (err) {
        console.error("Fout bij ophalen weerdata:", err);
        return {
            temp: 15,
            pressure: 1013,
            windSpeed: 10,
            windDir: 180,
            weatherCode: 0,
            dailyMax: 18,
            dailyMin: 10
        };
    }
}

/**
 * Zoekt waterstructuren rondom gekozen coördinaten
 */
export async function fetchWaterNodes(lat, lng) {
    const query = `[out:json][timeout:4];
        (
          way["natural"="water"](around:400,${lat},${lng});
          way["waterway"](around:400,${lat},${lng});
          way["bridge"](around:400,${lat},${lng});
          node["waterway"](around:400,${lat},${lng});
        );
        out center 15;`;

    const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Overpass API Fout");
        const data = await response.json();
        return data.elements || [];
    } catch (e) {
        clearTimeout(timeoutId);
        return []; // Trigger fallback
    }
}
