export const speciesData = {
    roofvis: [
        { key: "snoekbaars", name: "Snoekbaars", depth: "3.0 - 8.0m", hotspot: "Steile taluds, harde zand/grindbodems, brugpijlers.", tackle: "Jiggen met shads (8-12cm), dropshot of kleine doodaasvisjes.", min: "42 cm", closed: "1 mrt t/m laatste za mei" },
        { key: "snoek", name: "Snoek", depth: "0.5 - 2.5m", hotspot: "Rietkragen, lelievelden, bruggen & overhangende takken.", tackle: "Shads (12-20cm), jerkbaits, spinnerbaits of dode voorn.", min: "45 cm", closed: "1 mrt t/m laatste za april" },
        { key: "baars", name: "Baars", depth: "1.0 - 4.0m", hotspot: "Damwanden, houten paaltjes, steenstort bij kades.", tackle: "Kleine spinners, twitchbaits, Carolina rig met kreeftjes.", min: "22 cm", closed: "1 apr t/m laatste za mei" },
        { key: "meerval", name: "Meerval", depth: "2.0 - 10.0m", hotspot: "Diepe kolken, stroomversnellingen bij kribben.", tackle: "Grote trossen pieren, meervalshads, onderwaterdobber.", min: "Terugzetplicht", closed: "Geen" }
    ],
    witvis: [
        { key: "brasem", name: "Brasem", depth: "2.0 - 6.0m", hotspot: "Platte zand- en kleibodems, luwtes van havens.", tackle: "Feederhengel, korf met voer, maden, casters en maïs.", min: "Geen", closed: "Geen" },
        { key: "voorn", name: "Voorn", depth: "1.0 - 3.0m", hotspot: "Rietkanten, stadsgrachten, rustig stromend water.", tackle: "Vaste stok, licht dobbertje (0.5g), enkele maai of brooddeeg.", min: "Geen", closed: "Geen" },
        { key: "zeelt", name: "Zeelt", depth: "0.5 - 2.0m", hotspot: "Dichte lelievelden, zachte modderbodems.", tackle: "Matchhengel met dobber, blikmaïs, pieren.", min: "Geen", closed: "Geen" }
    ],
    karper: [
        { key: "karper", name: "Spiegel / Schubkarper", depth: "1.0 - 4.0m", hotspot: "Taluds, schone zandplaten tussen planten, eilandjes.", tackle: "Self-hook rigs, boilies, tijgernoten of pop-ups.", min: "Geen", closed: "Geen" },
        { key: "graskarper", name: "Graskarper", depth: "0.2 - 1.5m", hotspot: "Ondiepe baaien, dichte plantenbedden.", tackle: "Korst brood aan de oppervlakte, maïs of zachte pellets.", min: "Geen", closed: "Geen" }
    ],
    forel: [
        { key: "forel", name: "Regenboogforel", depth: "0.5 - 2.5m", hotspot: "Stromend water, beluchters, diepe hoeken van visvijvers.", tackle: "PowerBait, micro-spoons, wasmotten onder spiroline.", min: "Geen", closed: "Geen" }
    ],
    paling: [
        { key: "paling", name: "Paling", depth: "1.5 - 6.0m", hotspot: "Steenstort, beschoeiingen, donkere gaten.", tackle: "⚠️ Algeheel meeneemverbod. Direct onbeschadigd terugzetten!", min: "BESCHERMD", closed: "Het hele jaar beschermd" }
    ]
};

export function getSolunarData(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // Correcte 0-11 index
    const day = date.getDate();

    const c = Math.floor(365.25 * year) + Math.floor(year / 400) - Math.floor(year / 100);
    const dayAge = (c + day + ((month + 1) * 30.6) - 694039.09) % 29.53059;

    let phaseName = "Eerste Kwartier 🌓";
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
        moonAgeDays: Math.abs(dayAge).toFixed(1),
        phaseName,
        scoreBonus,
        majorPeriods: "Zonsopkomst & Zonsondergang (+/- 1.5 uur)",
        minorPeriods: "Maan-transit (midden op de dag & nacht)"
    };
}

export function calculateWaterTemp(airTemp, season) {
    let temp = airTemp || 15;
    let estimatedWaterTemp = temp;

    switch (season) {
        case "winter": estimatedWaterTemp = Math.max(1, temp * 0.65 + 2.5); break;
        case "voorjaar": estimatedWaterTemp = Math.max(4, temp * 0.75 + 2.0); break;
        case "zomer": estimatedWaterTemp = Math.min(24, temp * 0.82 + 3.5); break;
        case "herfst": estimatedWaterTemp = Math.max(5, temp * 0.70 + 2.5); break;
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

export function getSpeciesEcoRules(speciesKey, season) {
    if (["snoekbaars", "snoek", "baars"].includes(speciesKey) && season === "voorjaar") {
        return {
            warning: "⚠️ Gesloten Tijd / Paaitijd: Let op wettelijke gesloten tijden voor kunstaas en vissteaks!",
            ethicsTip: "Hanteer snelle Catch & Release en houd de vis niet te lang boven water."
        };
    }
    return {
        warning: null,
        ethicsTip: "Respecteer de stek, laat geen lijnen of rommel achter."
    };
}

export function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return "voorjaar";
    if (month >= 6 && month <= 8) return "zomer";
    if (month >= 9 && month <= 11) return "herfst";
    return "winter";
}
