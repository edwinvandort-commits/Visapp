import { initMap, setUserMarker } from './map.js';
import { setupUI, updateDashboardUI } from './ui.js';
import { speciesData, getCurrentSeason } from './advice.js';

let currentSelectedFish = speciesData.roofvis[0];
let currentSeason = getCurrentSeason();
let lastLocationData = null;

document.addEventListener('DOMContentLoaded', async () => {
    const statusBar = document.getElementById('status-bar');
    
    // Standaard coördinaten (Utrecht Centrum)
    const defaultLat = 52.0907;
    const defaultLng = 5.1214;

    if (statusBar) statusBar.textContent = "Kaart initialiseren...";

    // 1. Initialiseer UI-listeners
    setupUI(
        (catKey) => { /* Categorie gewijzigd */ },
        (selectedFish) => {
            currentSelectedFish = selectedFish;
            refreshDashboard();
        }
    );

    // Luister naar seizoensverandering
    const seasonSelect = document.getElementById('season-select');
    if (seasonSelect) {
        seasonSelect.value = currentSeason;
        seasonSelect.addEventListener('change', (e) => {
            currentSeason = e.target.value;
            refreshDashboard();
        });
    }

    try {
        // 2. Initialiseer Kaart
        const map = initMap(defaultLat, defaultLng, (locationData) => {
            lastLocationData = locationData;
            if (statusBar) {
                statusBar.textContent = `📍 Locatie geselecteerd: ${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}`;
            }
            refreshDashboard();
        });

        // Plaats startmarker
        setUserMarker(defaultLat, defaultLng);

        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 200);

        if (statusBar) {
            statusBar.textContent = "📍 Klik op de kaart om visadvies en waterdata te laden";
        }

    } catch (error) {
        console.error("Fout bij het laden van de app:", error);
        if (statusBar) {
            statusBar.textContent = "⚠️ Kaart geladen met beperkte functies. Klik op de kaart.";
        }
    }
});

function refreshDashboard() {
    // Gebruik fallback locatie als er nog geen klik is geweest
    const location = lastLocationData || {
        lat: 52.0907,
        lng: 5.1214,
        waterChar: { category: "Binnenwater / Kanaal", depth: "1.5 - 3.5m", profile: "Egalig met zachte bodem" },
        tidalInfo: { isTidal: false, waterType: "Zoetwater", tip: "" },
        weather: { temp: 15 }
    };

    updateDashboardUI(currentSelectedFish, location.waterChar, location.tidalInfo, location.weather, currentSeason);
}
