function checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === "roofvis2026") {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        initMap();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

let map, currentLat, currentLng, activeMarker = null, selectedSpecies = 'baars';

function initMap() {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([52.0907, 5.1214], 8);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        map.on('click', function(e) { handleLocationSelect(e.latlng.lat, e.latlng.lng); });
    }
}

function useCurrentLocation() {
    if (navigator.geolocation) {
        document.getElementById('status-text').innerText = "Locatie zoeken via GPS...";
        navigator.geolocation.getCurrentPosition(function(pos) {
            map.setView([pos.coords.latitude, pos.coords.longitude], 13);
            handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        }, function() { alert("GPS mislukt. Tik handmatig op de kaart."); });
    }
}

function handleLocationSelect(lat, lng) {
    currentLat = lat; currentLng = lng;
    if (activeMarker) { activeMarker.setLatLng([lat, lng]); } 
    else { activeMarker = L.marker([lat, lng]).addTo(map); }
    document.getElementById('status-text').style.display = 'block';
    document.getElementById('advice-content').style.display = 'none';
    document.getElementById('status-text').innerText = "Data ophalen en berekenen...";
    getWeatherData(lat, lng);
}

function selectSpecies(species) {
    selectedSpecies = species;
    document.querySelectorAll('.btn-species').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) { event.target.classList.add('active'); }
    if (currentLat && currentLng) { handleLocationSelect(currentLat, currentLng); }
}

function getWeatherData(lat, lng) {
    fetch(`https://open-meteo.com{lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m`)
        .then(res => res.json()).then(data => {
            let w = data.current, bft = Math.min(7, Math.floor(w.wind_speed_10m / 7));
            let txt = `${w.temperature_2m}°C met windkracht ${bft} Bft.`;
            let hs = "", tc = "";
            if (selectedSpecies === "baars") {
                hs = w.temperature_2m < 10 ? "Diepe gaten, havens of luwte achter peilers. Ligt passief tegen de bodem." : "Actief! Harde bodems, mosselbanken, bruggen en houten palen.";
                tc = w.temperature_2m < 10 ? "Carolina Rig of kleine shad (5-7cm). Extreem traag vissen met lichte loodkop (3-5g)." : "Kleine plugjes, spinners of crankbaits. Felle kleuren bij bewolking.";
            } else if (selectedSpecies === "snoek") {
                hs = w.temperature_2m > 20 ? "Warm water. In de buurt van plantenbedden of in stromend, zuurstofrijk water." : "Ideaal! Richt je op de overgang van diep naar ondiep water (taluds) en rietkragen.";
                tc = w.temperature_2m > 20 ? "Niet te diep vissen. Grote spinners of chatterbaits die veel trillingen maken werken top." : "Grote shads (15-20cm) of jerkbaits. Gebruik altijd een stalen onderlijn!";
            } else {
                hs = "Snoekbaars haat licht. Zoek diep water op (4-8m), troebel water, of schaduw onder grote bruggen.";
                tc = w.temperature_2m < 12 ? "Dropshot montage met slanke worm-achtige softbait. Beweeg bijna niet." : "Stinger montage op een shad van 10-12cm. Vis strak tegen de bodem aan.";
            }
            document.getElementById('status-text').style.display = 'none';
            document.getElementById('advice-content').style.display = 'block';
            document.getElementById('weather-info').innerText = txt;
            document.getElementById('hotspot-info').innerText = hs;
            document.getElementById('tackle-info').innerText = tc;
        }).catch(() => { document.getElementById('status-text').innerText = "Fout bij ophalen data."; });
}

