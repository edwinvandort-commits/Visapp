// js/map.js
import { fetchWaterNodes, getWaterCharacteristics, checkTidalZone, getWeatherData } from './api.js';

let map = null;
let userMarker = null;
let hotspotMarkers = [];

export function initMap(initialLat, initialLng, onLocationSelect) {
    if (map) return map;

    // Gebruik betrouwbare HTTPS tegel-servers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19,
        attribution: '© OpenStreetMap' 
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri'
    });

    // OpenSeaMap laag voor zeekaarten en waterdieptes
    const seaMapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: 'OpenSeaMap'
    });

    map = L.map('map', { 
        zoomControl: true,
        layers: [osmLayer]
    }).setView([initialLat, initialLng], 12);

    const baseMaps = {
        "🗺️ Standaard Kaart": osmLayer,
        "🛰️ Satellietkaart": satelliteLayer
    };

    const overlayMaps = {
        "🌊 Diepte & Navigatie (OpenSeaMap)": seaMapLayer
    };

    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

    // Kaartklik event
    map.on('click', async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        setUserMarker(lat, lng);
        await processLocationChange(lat, lng, onLocationSelect);
    });

    // Forceer Leaflet om direct en na korte vertraging de maten opnieuw te berekenen
    map.invalidateSize();
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 300);

    return map;
}

export function setUserMarker(lat, lng) {
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else if (map) {
        userMarker = L.marker([lat, lng]).addTo(map);
    }
}

export function centerMap(lat, lng, zoom = 13) {
    if (map) {
        map.setView([lat, lng], zoom);
        setUserMarker(lat, lng);
        setTimeout(() => map.invalidateSize(), 100);
    }
}

export async function processLocationChange(lat, lng, callback) {
    let nodes = [];
    let weather = null;

    // Gebruik try-catch zodat een vastlopende API de kaart niet blokkeert
    try {
        const fetchPromise = Promise.all([
            fetchWaterNodes(lat, lng),
            getWeatherData(lat, lng)
        ]);

        // Maximaal 3 seconden wachten op API's, anders doorgaan
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 3000)
        );

        const results = await Promise.race([fetchPromise, timeoutPromise]);
        nodes = results[0] || [];
        weather = results[1] || null;
    } catch (err) {
        console.warn("API ophalen duurde te lang of gaf fout, vallen terug op basisdata:", err);
    }

    let mainWater = nodes.find(e => e.tags && (e.tags.waterway || e.tags.natural === 'water'));
    let waterType = mainWater ? (mainWater.tags.waterway || mainWater.tags.natural) : 'water';
    let waterName = mainWater && mainWater.tags ? mainWater.tags.name : '';

    const waterChar = getWaterCharacteristics(waterType, waterName);
    const tidalInfo = checkTidalZone(lat, lng);

    // Plaats hotspot markers
    renderHotspotMarkers(nodes, lat, lng);

    if (callback) {
        callback({
            lat,
            lng,
            waterChar,
            tidalInfo,
            weather
        });
    }
}

function renderHotspotMarkers(nodes, lat, lng) {
    // Verwijder oude markers
    hotspotMarkers.forEach(m => map.removeLayer(m));
    hotspotMarkers = [];

    if (nodes && nodes.length > 0) {
        let count = 0;
        nodes.forEach(el => {
            if (count >= 5) return;
            let wLat = el.center ? el.center.lat : el.lat;
            let wLng = el.center ? el.center.lon : el.lon;

            if (wLat && wLng) {
                let marker = L.marker([wLat, wLng]).addTo(map);
                marker.bindPopup(`<b>🎯 Mogelijke Visstek / Structuur</b><br>Bodem overgang of oever-element.`);
                hotspotMarkers.push(marker);
                count++;
            }
        });
    } else {
        // Fallback simulatiewaarden rondom gekozen punt
        const offsets = [
            { latOff: 0.0010, lngOff: 0.0012, title: "🌊 Stroomnaad / Kolk" },
            { latOff: -0.0008, lngOff: -0.0010, title: "🌉 Schaduwzone / Beschoeiing" }
        ];

        offsets.forEach(spot => {
            let marker = L.marker([lat + spot.latOff, lng + spot.lngOff]).addTo(map);
            marker.bindPopup(`<b>${spot.title}</b><br>Verwachte schuilplaats voor vis.`);
            hotspotMarkers.push(marker);
        });
    }
}
