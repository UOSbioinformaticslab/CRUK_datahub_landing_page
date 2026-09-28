/**
 * Resolves supplementary mapping terms based on topography and histology filters.
 * @param {Object} file - The dataset metadata catalog item.
 * @param {Object} extraTerms - The parsed mapping object containing cross-walked categorizations.
 * @returns {Array} Unified collection of resolved cross-walked term items not already present.
 */
export function getExtra(file, extraTerms) {
    if (!file) return [];

    const existingFilters = file.datasetFilters || [];
    const existingIds = new Set(existingFilters.map(f => typeof f === 'object' ? f.id : f));

    const tcgaCruk = getExtraTerms(file, extraTerms, existingIds);

    // Combine existing IDs and new TCGA terms so child/male functions trigger correctly
    const triggerIds = new Set([...existingIds, ...tcgaCruk.map(e => e.id)]);

    const plusChildren = getChildTerms(tcgaCruk, file, triggerIds);
    const finalTerms = getMaleSpecific(plusChildren, file, triggerIds);

    // Filter out any terms appended by the child/male functions that are already in the dataset
    return finalTerms.filter(term => !existingIds.has(term.id));
}

function getExtraTerms(file, extraTerms, existingIds) {
    const filters = file.datasetFilters || [];

    // Filter matching IDs starting with '0_0_0' (Topography) and '0_0_1' (Histology)
    const tops = filters.filter(f => f.id && f.id.startsWith("0_0_0")).map(f => f.label);
    const hist = filters.filter(f => f.id && f.id.startsWith("0_0_1")).map(f => f.label);

    const extra = [];
    const seenIds = new Set();

    for (const t of tops) {
        const histMap = extraTerms[t];
        if (!histMap) continue;

        for (const h of hist) {
            const termsList = histMap[h];
            if (!Array.isArray(termsList)) continue;

            for (const term of termsList) {
                // Check against both the existing dataset tags and tags generated in this loop
                if (term.id && !existingIds.has(term.id) && !seenIds.has(term.id)) {
                    extra.push({ ...term });
                    seenIds.add(term.id);
                }
            }
        }
    }
    return extra;
}

function getChildTerms(extra, file, ids) {
    const ageMax = file.coverage?.typicalAgeRangeMax;
    const hasYoungAge = ageMax !== undefined && ageMax < 19;
    const hasChildId = ids.has("0_2_3_0_0");

    if (hasYoungAge || hasChildId) {
        extra.push({
            id: '0_0_2_23',
            label: "Children's cancers",
            category: 'crukTerms',
            primaryGroup: 'cancer-type',
            description: ''
        });

        if (ids.has("0_0_2_1")) {
            extra.push({
                id: '0_0_2_2',
                label: 'Acute lymphoblastic leukaemia (ALL) in children',
                category: 'crukTerms',
                primaryGroup: 'cancer-type',
                description: ''
            });
        }
        if (ids.has("0_0_2_12")) {
            extra.push({
                id: '0_0_2_13',
                label: 'Brain tumours in children',
                category: 'crukTerms',
                primaryGroup: 'cancer-type',
                description: ''
            });
        }
        if (ids.has("0_0_2_70")) {
            extra.push({
                id: '0_0_2_71',
                label: 'Non-Hodgkin lymphoma in children',
                category: 'crukTerms',
                primaryGroup: 'cancer-type',
                description: ''
            });
        }
    }
    return extra;
}

function getMaleSpecific(extra, file, ids) {
    const keywords = file.summary?.keywords || [];
    const lowerKeywords = keywords.map(k => String(k).toLowerCase());

    if (!ids.has("0_0_2_12")) {
        const genderPairs = [
            ["male", "female"],
            ["men", "women"],
            ["man", "woman"],
            ["boy", "girl"]
        ];

        for (const phrase of lowerKeywords) {
            let loopShouldTerminate = false;

            for (const [maleTerm, femaleTerm] of genderPairs) {
                if (phrase.includes(maleTerm) && !phrase.includes(femaleTerm)) {
                    extra.push({
                        id: '0_0_2_57',
                        label: "Men's cancer",
                        category: 'crukTerms',
                        primaryGroup: 'cancer-type',
                        description: ''
                    });

                    if (ids.has("0_0_2_15")) {
                        extra.push({
                            id: '0_0_2_16',
                            label: "Breast cancer in men",
                            category: 'crukTerms',
                            primaryGroup: 'cancer-type',
                            description: ''
                        });
                    }
                    loopShouldTerminate = true;
                    break;
                }
            }
            // Mimics the early return behavior of the source loop positioning
            if (loopShouldTerminate) break;
        }
    }
    return extra;
}