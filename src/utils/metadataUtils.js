import animalIcon from '../assets/animal.webp';
import backgroundIcon from '../assets/background.webp';
import biobankIcon from '../assets/biobank.webp';
import invitroIcon from '../assets/invitro.webp';
import longitudinalIcon from '../assets/longitudinal.webp';
import treatmentsIcon from '../assets/treatments.webp';
import omicsIcon from '../assets/omics.webp';
import imagingIcon from '../assets/medical_imaging.webp';
import labResultsIcon from '../assets/lab_results.webp';

export const ICON_MAPPING = {
  "Model Organisms": { src: animalIcon, label: "Model Organisms" },
  "Demographics": { src: backgroundIcon, label: "Demographics" },
  "Background": { src: backgroundIcon, label: "Demographics" },
  "Biobank Samples": { src: biobankIcon, label: "Biobank Samples" },
  "In Vitro Studies": { src: invitroIcon, label: "In Vitro Studies" },
  "Longitudinal Follow up": { src: longitudinalIcon, label: "Longitudinal" },
  "Treatments": { src: treatmentsIcon, label: "Treatments" },
  "Multi-omic Data": { src: omicsIcon, label: "Multi-omic Data" },
  "Imaging types": { src: imagingIcon, label: "Imaging Data" },
  "Imaging Data": { src: imagingIcon, label: "Imaging Data" },
  "Biopsy Results and Lab Reports": { src: labResultsIcon, label: "Lab Results" }
};

export const ETHNICITY_CATEGORIES = [
   "White - British", "White - Irish", "White - Any other White background",
   "Mixed - White and Black Caribbean", "Mixed - White and Black African", "Mixed - White and Asian", "Mixed - Any other mixed background",
   "Asian or Asian British - Indian", "Asian or Asian British - Pakistani", "Asian or Asian British - Bangladeshi", "Asian or Asian British - Any other Asian background",
   "Black or Black British - Caribbean", "Black or Black British - African", "Black or Black British - Any other Black background",
   "Other Ethnic Groups - Chinese", "Other Ethnic Groups - Any other ethnic group", "Not stated", "Not known"
];

export const flattenFilterTree = (nodes, parentPath = []) => {
    let map = {};
    if (!nodes || typeof nodes !== 'object') return map;

    Object.values(nodes).forEach(node => {
        const currentPath = [...parentPath, node.label];
        const fullPathString = currentPath.join(" > ");

        map[node.id] = {
            label: node.label,
            fullPath: fullPathString,
            rawPath: currentPath
        };

        if (node.children) {
            Object.assign(map, flattenFilterTree(node.children, currentPath));
        }
    });
    return map;
};

export const getFilterConfig = (id) => {
    if (id.startsWith("0_0_2")) return { group: "Cancer Filters", category: "CRUK Cancer Terms", showPath: false };
    if (id.startsWith("0_0_4")) return { group: "Cancer Filters", category: "TCGA Terms", showPath: false };
    if (id.startsWith("0_0_0")) return { group: "Cancer Filters", category: "ICD-O Topography", showPath: true, slice: 2 };
    if (id.startsWith("0_0_1")) return { group: "Cancer Filters", category: "ICD-O Histology", showPath: true, slice: 2 };
    if (id.startsWith("0_0")) return { group: "Cancer Filters", category: "Other Cancer Types", showPath: true, slice: 1 };
    if (id.startsWith("0_2")) return { group: "Data Filters", category: "Data Types", showPath: true, slice: 1 };
    if (id.startsWith("0_1")) return { group: "Access Filters", category: "Access Types", showPath: false };

    return { group: "Other Filters", category: "Miscellaneous", showPath: true, slice: 0 };
};

export const getFirstTwoSentences = (text) => {
  if (!text) return "";
  const match = text.match(/^.*?[.!?](?:\s|$)(?:.*?[.!?](?:\s|$))?/);
  return match ? match[0] : text;
};

export const normalizeList = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return input.split(';,;').map(k => k.trim());
};

export const extractMetadataConstants = (data) => {
  const id = data.id;
  const blob = data.metadata_blob;

  // Safely extract top-level objects from the targeted blob
  const summary = blob?.summary || {};
  const filters = blob?.datasetFilters || [];
  const temporal = blob?.temporal || {};

  // Standard extractions from summary
  const leadResearcher = summary.leadResearcher || null;
  const popSize = summary.populationSize || null;
  const title = summary.title || null;
  const abstract = summary.abstract || null;
  const datasetCustodian = summary.dataCustodian?.name || null;

  // Accessibility extraction
  const accessFilter = filters.find(f => f.category === "accessType");
  const accessibility = accessFilter ? accessFilter.label : null;

  // Commercial use extraction
  const nonCommercialUseOnly = filters.some(f => f.label === "non-commercial use only") ? "True" : "False";

  // Data Range extraction
  const startYear = temporal.startDate ? temporal.startDate.substring(0, 4) : "";
  const endYear = temporal.endDate ? temporal.endDate.substring(0, 4) : "";
  const dataRange = (startYear && endYear) ? `${startYear} - ${endYear}` : null;

  return {
    id,
    leadResearcher,
    popSize,
    accessibility,
    nonCommercialUseOnly,
    dataRange,
    title,
    abstract,
    datasetCustodian
  };
};