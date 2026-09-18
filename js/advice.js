// js/advice.js

/**
 * Uitgebreide database met per vissoort unieke waarden
 */
export const speciesData = {
    roofvis: [
        { key: "snoek", name: "Snoek", depth: "0.5 - 2.5m", distance: "3 - 15m", hotspot: "Rietkragen, lelievelden, bruggen & overhangende takken.", tackle: "Shads (12-20cm), jerkbaits, spinnerbaits of dode voorn op de takel.", min: "45 cm", closed: "1 mrt t/m laatste za april" },
        { key: "snoekbaars", name: "Snoekbaars", depth: "3.0 - 8.0m", distance: "10 - 40m", hotspot: "Steile taluds, harde zand/grindbodems, brugpijlers en vaargeulen.", tackle: "Jiggen met shads (8-12cm), dropshot of kleine doodaasvisjes op de bodem.", min: "42 cm", closed: "1 mrt t/m laatste za mei" },
        { key: "baars", name: "Baars", depth: "1.0 - 4.0m", distance: "2 - 20m", hotspot: "Damwanden, houten paaltjes, brugpijlers, steenstort bij kades.", tackle: "Kleine spinners, twitchbaits, Carolina/Texas rig met kreeftjes.", min: "22 cm", closed: "1 apr t/m laatste za mei" },
        { key: "meerval", name: "Meerval", depth: "2.0 - 10.0m", distance: "15 - 50m", hotspot: "Diepe kolken, stroomversnellingen bij kribben en ondergelopen structuren.", tackle: "Grote trossen pieren, meervalshads, onderwaterdobber op stromend water.", min: "Terugzetplicht", closed: "Geen" }
    ],
    witvis: [
        { key: "brasem", name: "Brasem", depth: "2.0 - 6.0m", distance: "15 - 40m", hotspot: "Platte zand- en kleibodems, luwtes van havens en kanalen.", tackle: "Feederhengel, korf met voer, maden, casters, maïs en pier.", min: "Geen", closed: "Geen" },
        { key: "voorn", name: "Voorn", depth: "1.0 - 3.0m", distance: "5 - 15m", hotspot: "Mooie rietkanten, stadsgrachten, rustig stromend water.", tackle: "Vaste stok, licht dobbertje (0.5g), enkele maai of brooddeeg.", min: "Geen", closed: "Geen" },
        { key: "zeelt", name: "Zeelt", depth: "0.5 - 2.0m", distance: "2 - 10m", hotspot: "Dichte lelievelden, zachte modderbodems en rietbochten.", tackle: "Matchhengel met dobber, blikmaïs, pieren, mini-boilies.", min: "Geen", closed: "Geen" }
    ],
    karper: [
        { key: "karper", name: "Spiegel / Schubkarper", depth: "1.0 - 4.0m", distance: "10 - 50m", hotspot: "Taluds, schone zandplaten tussen planten, eilandjes en rietbochten.", tackle: "Self-hook rigs, boilies, tijgernoten of pop-ups op een voerplek.", min: "Geen", closed: "Geen" },
        { key: "graskarper", name: "Graskarper", depth: "0.2 - 1.5m", distance: "5 - 20m", hotspot: "Ondiepe baaien, dichte plantenbedden en zonnige oppervlaktes.", tackle: "Korst brood aan de oppervlakte, maïs of zachte pellets op de bodem.", min: "Geen", closed: "Geen" }
    ],
    forel: [
        { key: "forel", name: "Regenboogforel", depth: "0.5 - 2.5m", distance: "10 - 30m", hotspot: "Stromend water, beluchters, diepe hoeken van visvijvers.", tackle: "PowerBait, micro-spoons, wasmotten onder een spiroline.", min: "Geen", closed: "Geen" }
    ],
    paling: [
        { key: "paling", name: "Paling", depth: "1.5 - 6.0m", distance: "5 - 25m", hotspot: "Steenstort, beschoeiingen, donkere gaten, bruggen.", tackle: "⚠️ Algeheel meeneemverbod. Direct onbeschadigd terugzetten!", min: "BESCHERMD", closed: "Het hele jaar beschermd" }
    ]
};

/**
 * Punt 2: Solunaire & Astronomische Beetindex
 */
export function getSolunarData(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Benadering synodische maancyclus (29.53 dagen)
    const c = Math.floor(365.25 * year) + Math.floor(year / 400) - Math.floor(year / 100);
    const dayAge = (c + day + (month * 30.6) - 694039.09) % 29.53059;

    let phaseName = "Eerste Kwartier";
    let scoreBonus = 5;

    if (dayAge < 1.84) { phaseName = "Nieuwe Maan 🌑"; scoreBonus = 18; }
    else if (dayAge < 5.53) { phaseName = "Wassende Sikkel 🌒"; scoreBonus = 8; }
    else if (dayAge < 9.22) { phaseName = "Eerste Kwartier 🌓"; scoreBonus = 5; }
    else if (dayAge < 12.91) { phaseName = "Wassende Maan 🌔"; scoreBonus = 12; }
    else if (dayAge < 16.61) { phaseName = "Volle Maan 🌕"; scoreBonus = 20; }
    else if (dayAge < 20.30) { phaseName = "Krimpende Maan 🌖"; scoreBonus = 10; }
    else if (dayAge < 23.99) { phaseName = "Laatste Kwartier 🌗"; scoreBonus = 5; }
    else { phaseName = "Afnemende Sikkel 🌘"; scoreBonus = 8; }

    return {
        moonAgeDays: dayAge.toFixed(1),
        phaseName,
        scoreBonus,
        majorPeriods: "Zonsopkomst & Zonsondergang (+/- 1.5 uur)",
        minorPeriods: "Maan-transit (midden op de dag & nacht)"
    };
}

/**
 * Punt 4: Berekende Watertemperatuur (Lag-model) & Zuurstofstatus
 */
export function calculateWaterTemp(airTemp, season) {
    let estimatedWaterTemp = airTemp;

    switch (season) {
        case "winter":
            estimatedWaterTemp = Math.max(1, airTemp * 0.65 + 2.5);
            break;
        case "voorjaar":
            estimatedWaterTemp = Math.max(4, airTemp * 0.75 + 2.0);
            break;
        case "zomer":
            estimatedWaterTemp = Math.min(24, airTemp * 0.82 + 3.5);
            break;
        case "herfst":
            estimatedWaterTemp = Math.max(5, airTemp * 0.70 + 2.5);
            break;
    }

    let oxygenStatus = "Optimaal";
    if (estimatedWaterTemp > 21) {
        oxygenStatus = "⚠️ Laag (Roofvis reageert passief, voorzichtig bij terugzetten)";
    } else if (estimatedWaterTemp < 6) {
        oxygenStatus = "Hoog, maar vismetabolisme staat op een laag pitje";
    }

    return {
        estimatedWaterTemp: estimatedWaterTemp.toFixed(1),
        oxygenStatus
    };
}

/**
 * Punt 5: Seizoensgebonden Vis-Migratie & Paaitijden
 */
export function getSpeciesEcoRules(speciesKey, season) {
    if (speciesKey === "snoekbaars" || speciesKey === "snoek" || speciesKey === "baars") {
        if (season === "voorjaar") {
            return {
                isClosedSeason: true,
                warning: "⚠️ Gesloten Tijd / Paaitijd: Roofvis ligt vaak op het nest. Let op wettelijke gesloten tijden voor kunstaas en vissteaks!",
                ethicsTip: "Hanteer snelle Catch & Release en houd de vis niet te lang boven water."
            };
        }
    } else if (speciesKey === "karper" && season === "voorjaar") {
        return {
            isClosedSeason: false,
            warning: "🌸 Paaitijd: Karpers verzamelen zich op de ondieptes/rietvelden en zijn vaak minder gericht op aas.",
            ethicsTip: "Gebruik altijd een onthakingsmat en ruime bewaarzak."
        };
    }
    
    return {
        isClosedSeason: false,
        warning: null,
        ethicsTip: "Respecteer de stek, laat geen lijnen/rommel achter."
    };
}

/**
 * Bepaalt het huidige seizoen
 */
export function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return "voorjaar";
    if (month >= 6 && month <= 8) return "zomer";
    if (month >= 9 && month <= 11) return "herfst";
    return "winter";
}
