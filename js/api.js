// js/app.js
import { initMap, centerMap } from './map.js';

document.addEventListener('DOMContentLoaded', async () => {
    const statusBar = document.getElementById('status-bar');
    
    // Default coördinaten (Utrecht/Centrum NL)
    const defaultLat = 52.0907;
    const defaultLng = 5.1214;

    if (statusBar) {
        statusBar.textContent = "Kaart initialiseren...";
    }

    try {
        // 1. Start de kaart op
        const map = initMap(defaultLat, defaultLng, (locationData) => {
            // Callback wanneer er op de kaart wordt geklikt
            updateDashboard(locationData);
        });

        // 2. Herbereken kaartgrootte direct voor Chrome/macOS
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 200);

        // 3. Werk de statusbalk bij
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

function updateDashboard(data) {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.textContent = `Locatie geselecteerd: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`;
    }
    
    // Vul hier eventueel overige dashboard velden aan
}
