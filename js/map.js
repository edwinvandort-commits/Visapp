let map = null;
let userMarker = null;
let hotspotMarkers = [];

export function initMap(initialLat, initialLng, onLocationSelect) {
    if (map) return map;

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19,
        attribution: '© OpenStreetMap' 
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri'
    });

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

    map.invalidateSize();
    setTimeout(() => { if (map) map.invalidateSize(); }, 300);

    return map;
}

export function setUserMarker(lat, lng) {
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else if (map) {
        userMarker = L.marker([lat, lng]).addTo(map);
    }
}

export async function processLocationChange(lat, lng, callback) {
    // Gesimuleerde water- en weerkenmerken (uit te breiden met externe API)
    const waterChar = {
        category: "Kanaal / Rivierarm",
        depth: "2.0 - 4.5m",
        profile: "Steil talud met stenen beschoeiing"
    };

    const tidalInfo = {
        isTidal: lat < 51.90 && lng < 4.30, // Globale check voor estuarium/kust
        waterType: (lat < 51.90 && lng < 4.30) ? "Brak / Getijde" : "Zoetwater",
        tip: "Vis bij afgaand water rondom kribben en uitstromers."
    };

    const weather = { temp: 16 };

    renderHotspotMarkers(lat, lng);

    if (callback) {
        callback({ lat, lng, waterChar, tidalInfo, weather });
    }
}

function renderHotspotMarkers(lat, lng) {
    hotspotMarkers.forEach(m => map.removeLayer(m));
    hotspotMarkers = [];

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
