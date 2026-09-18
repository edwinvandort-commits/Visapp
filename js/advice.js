/**
 * Berekent de indicatieve weerscore op basis van temperatuur, wind en luchtdruk.
 */
export function calculateIndicativeScore(weatherData) {
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

/**
 * Genereert dynamische adviezen specifiek voor de vissoort, het seizoen en de locatie.
 */
export function generateZoneAdvice(zone, weather, species, season) {
    let whereText = "";
    let whyText = "";
    let howText = "";

    // 1. Waar letten?
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

    // 2. Waarom?
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

    // 3. Hoe vissen?
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
