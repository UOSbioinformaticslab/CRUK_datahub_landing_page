import { filterDetailsMap } from './filter-setup.js';

const filterType = (id) => {
    const info = id.split("_");
    if (info.length < 3) return "unknown";

    const first = info[1];
    if (first === "2") {
        return "data"; // 0_2_...
    } else if (first === "1") {
        return "access"; // 0_1_...
    } else {
        // first === "0"
        const second = info[2];
        if (second === "1") {
            return "hist"; // 0_0_1_...
        }
        else if (second === "0") {
            return "top"; // 0_0_0_...
        }
        else if (second === "2") return "cruk";
        else if (second === "3") return "snomed";
        else if (second === "4") return "tcga";
        else if (second === "5") return "pan";
        return "unknown";
    }
};

const includeParents = (f) => {
    if (f) {
        const nms = f.split("_");
        if (nms[1] !== "1" && nms.length > 3) {
            const parents = [];
            for (let k = 4; k <= nms.length; k++) {
                parents.push(nms.slice(0, k).join("_"));
            }
            return parents;
        }
    }
    return [f];
};

const plusParents = (filters) => {
    if (!filters || filters.length === 0) return [];

    const allFilters = new Set();
    filters.forEach(f => {
        includeParents(f).forEach(parentOrSelf => {
            allFilters.add(parentOrSelf);
        });
    });

    return Array.from(allFilters).filter(id => filterDetailsMap.has(id));
};

const getMessage = (thelist, joiner) => {
    const length = thelist.length;
    if (length === 0) {
        return "";
    } else if (length === 1) {
        return filterDetailsMap.get(thelist[0])?.label || "";
    } else {
        const terms = thelist.map(id => filterDetailsMap.get(id)?.label).filter(Boolean);
        return `(${terms.join(` ${joiner} `)})`;
    }
};

const calculateLogicMessage = (filters, filterType, plusParents, includeParents, getMessage) => {
    const hist = filters.filter(f => filterType(f) === "hist");
    const top = filters.filter(f => filterType(f) === "top"
        || filterType(f) === "cruk"
        || filterType(f) === "snomed"
        || filterType(f) === "tcga"
        || filterType(f) === "pan");
    const data = filters.filter(f => filterType(f) === "data");
    const access = filters.filter(f => filterType(f) === "access");

    const messages = [];

    // HIST message: plus_parents and OR
    const hist_plus = plusParents(hist);
    const hist_message = getMessage(hist_plus, "OR");
    if (hist_message) messages.push(hist_message);

    // TOP/CRUK message: plus_parents and OR
    const top_plus = plusParents(top);
    const top_message = getMessage(top_plus, "OR");
    if (top_message) messages.push(top_message);

    // DATA message: include_parents (individually) and OR, then join groups with AND
    const data_messages = data.map(d => {
        const listWithParents = includeParents(d).filter(id => filterDetailsMap.has(id));
        return getMessage(listWithParents, "OR");
    }).filter(Boolean);

    const data_final_message = data_messages.join(" AND ");
    if (data_final_message) messages.push(data_final_message);

    // ACCESS message: simple list and OR
    const access_message = getMessage(access, "OR");
    if (access_message) messages.push(access_message);

    return messages.join(" AND ");
};

const getTokenArray = (thelist, joiner) => {
    const validIds = thelist.filter(id => filterDetailsMap.has(id));
    if (validIds.length === 0) return [];
    if (validIds.length === 1) {
        return [{ type: 'filter', id: validIds[0], label: filterDetailsMap.get(validIds[0])?.label || validIds[0] }];
    }
    
    const validTokens = [{ type: 'bracket', value: '(' }];
    validIds.forEach((id, idx) => {
        validTokens.push({ type: 'filter', id, label: filterDetailsMap.get(id)?.label || id });
        if (idx < validIds.length - 1) validTokens.push({ type: 'operator', value: joiner });
    });
    validTokens.push({ type: 'bracket', value: ')' });
    return validTokens;
};

const calculateLogicTokens = (filters) => {
    const hist = filters.filter(f => filterType(f) === "hist");
    const top = filters.filter(f => filterType(f) === "top"
        || filterType(f) === "cruk"
        || filterType(f) === "snomed"
        || filterType(f) === "tcga"
        || filterType(f) === "pan");
    const data = filters.filter(f => filterType(f) === "data");
    const access = filters.filter(f => filterType(f) === "access");

    const messageGroups = [];

    const hist_plus = plusParents(hist);
    const hist_tokens = getTokenArray(hist_plus, "OR");
    if (hist_tokens.length > 0) messageGroups.push(hist_tokens);

    const top_plus = plusParents(top);
    const top_tokens = getTokenArray(top_plus, "OR");
    if (top_tokens.length > 0) messageGroups.push(top_tokens);

    const data_messages = data.map(d => {
        const listWithParents = includeParents(d).filter(id => filterDetailsMap.has(id));
        return getTokenArray(listWithParents, "OR");
    }).filter(arr => arr.length > 0);

    if (data_messages.length > 0) {
        const combinedDataTokens = [];
        data_messages.forEach((arr, idx) => {
            combinedDataTokens.push(...arr);
            if (idx < data_messages.length - 1) combinedDataTokens.push({ type: 'operator', value: 'AND' });
        });
        messageGroups.push(combinedDataTokens);
    }

    const access_tokens = getTokenArray(access, "OR");
    if (access_tokens.length > 0) messageGroups.push(access_tokens);

    const finalTokens = [];
    messageGroups.forEach((group, idx) => {
        finalTokens.push(...group);
        if (idx < messageGroups.length - 1) {
            finalTokens.push({ type: 'operator', value: 'AND' });
        }
    });

    return finalTokens.map((t, idx) => ({ ...t, keyId: `token-${idx}-${Math.random().toString(36).substr(2, 9)}` }));
};

export {
    filterType,
    includeParents,
    plusParents,
    getMessage,
    calculateLogicMessage,
    getTokenArray,
    calculateLogicTokens
};