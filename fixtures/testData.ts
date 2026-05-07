export const users = {
  maker: {
    username: process.env.MAKER_USERNAME ?? 'maker.user',
    password: process.env.MAKER_PASSWORD ?? 'maker.password',
  },
  checker: {
    username: process.env.CHECKER_USERNAME ?? 'checker.user',
    password: process.env.CHECKER_PASSWORD ?? 'checker.password',
  },
};

const ts = Date.now();
const suffix = ts.toString().slice(-6);

export const counterpartyTypeData = {
  code: `CP${suffix}`,
  description: `Counterparty Type ${new Date(ts).toISOString()}`,
};

export const counterpartyTypeEditData = {
  code: `ED${suffix}`,
  description: `Edit Test ${new Date(ts).toISOString()}`,
  updatedDescription: `Updated Description ${new Date(ts).toISOString()}`,
};

export const counterpartyTypeDeleteData = {
  code: `DL${suffix}`,
  description: `Delete Test ${new Date(ts).toISOString()}`,
};

export const knownExistingCode = 'BFSI';

export const industryData = {
  code: `IN${suffix}`,
  description: `Industry ${new Date(ts).toISOString()}`,
  isTrading: true,
};

export const industryEditData = {
  code: `IE${suffix}`,
  description: `Industry Edit ${new Date(ts).toISOString()}`,
  updatedDescription: `Industry Updated ${new Date(ts).toISOString()}`,
  isTrading: false,
};

export const knownExistingIndustryCode = '1';

export const subIndustryData = {
  code: `SI${suffix}`,
  description: `Sub Industry ${new Date(ts).toISOString()}`,
  industry: 'Pharmaceuticals',
};

export const subIndustryEditData = {
  code: `SE${suffix}`,
  description: `Sub Industry Edit ${new Date(ts).toISOString()}`,
  updatedDescription: `Sub Industry Updated ${new Date(ts).toISOString()}`,
  industry: 'Pharmaceuticals',
};

export const knownExistingSubIndustryCode = '01';

export const branchTypeData = {
  code: `BT${suffix}`,
  description: `Branch Type ${new Date(ts).toISOString()}`,
};

export const branchTypeEditData = {
  code: `BE${suffix}`,
  description: `Branch Type Edit ${new Date(ts).toISOString()}`,
  updatedDescription: `Branch Type Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingBranchTypeCode = 'HO';

export const branchData = {
  code: `BR${suffix}`,
  description: `Branch ${new Date(ts).toISOString()}`,
  branchType: 'Head Office',
  parentBranch: 'HO',
  country: 'India',
  province: 'Central',
  currency: 'Indian Rupee',
};

export const branchEditData = {
  code: `BRE${suffix}`,
  description: `Branch Edit ${new Date(ts).toISOString()}`,
  updatedDescription: `Branch Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingBranchCode = 'HO';

export const knownViewableBranchCode = 'G';

export const knownEditableBranchCode = '16';

export const ratingTypeData = {
  code: `RT${suffix}`,
  description: `Model Type ${new Date(ts).toISOString()}`,
  investmentGradeCutoffRank: '5',
  scaleModel: false,
  scaleType: '2',
};

export const ratingTypeEditData = {
  updatedDescription: `Model Type Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingRatingTypeCode = 'CRF';
export const knownViewableRatingTypeCode = 'NBFC';

export const ratingParameterData = {
  code: `RP${suffix}`,
  description: `Rating Parameter ${new Date(ts).toISOString()}`,
  modelType: 'NBFC/HFC',
  riskCategory: 'DEFAULT',
  dataType: 'Numeric',
  parameterType: 'Financial',
};

export const ratingParameterCustomMasterData = {
  code: `CM${suffix}`,
  description: `RP Custom Master ${new Date(ts).toISOString()}`,
  modelType: 'NBFC/HFC',
  riskCategory: 'DEFAULT',
  dataType: 'Custom Master',
  parameterType: 'Financial',
};

export const ratingParameterSystemMasterData = {
  code: `SM${suffix}`,
  description: `RP System Master ${new Date(ts).toISOString()}`,
  modelType: 'NBFC/HFC',
  riskCategory: 'DEFAULT',
  dataType: 'System Master',
  parameterType: 'Financial',
};

export const ratingParameterOptionData = {
  code: `RPO${suffix}`,
  description: `RP Option ${new Date(ts).toISOString()}`,
  modelType: 'NBFC/HFC',
  riskCategory: 'DEFAULT',
  dataType: 'Option',
  parameterType: 'Financial',
  optionsAlphanumeric: 'ABC123',
  optionsNegative: '-100',
};

export const ratingParameterEditData = {
  updatedDescription: `Rating Parameter Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingRatingParameterCode = '5YCAGR';
export const knownViewableRatingParameterCode = 'Ability to raise capital';

// ─── Industry Median (Industry Parameter) ────────────────────────────────────

export const industryMedianData = {
  financialYear: `${suffix}`,
  asOnDate: '31/03/2024',
  pbidtMargin: '5.5',
  operatingCycle: '60',
  currentRatio: '1.2',
};

export const industryMedianEditData = {
  updatedFinancialYear: `${suffix}U`,
};

export const knownExistingIndustryMedianIndustry = '66';

// ─── Rating Attribute Mapping ─────────────────────────────────────────────────

export const ratingAttributeMappingData = {
  attributeId: '9999',
  dataType: `DT${suffix}`,
};

export const ratingAttributeMappingEditData = {
  updatedDataType: `DT Updated ${suffix}`,
};

export const knownExistingRatingAttributeMappingParam = 'PBILTDM';

// ─── Risk Categories Group ────────────────────────────────────────────────────

export const riskCategoriesGroupData = {
  code: `RCG${suffix}`,
  description: `Risk Cat Group ${new Date(ts).toISOString()}`,
};

export const riskCategoriesGroupEditData = {
  updatedDescription: `Risk Cat Group Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingRiskCategoriesGroupCode = 'LRD';

// ─── Risk Category ────────────────────────────────────────────────────────────

export const riskCategoryData = {
  code: `RC${suffix}`,
  description: `Risk Category ${new Date(ts).toISOString()}`,
  companyScore: 'Yes',
  notching: 'No',
};

export const riskCategoryEditData = {
  updatedDescription: `Risk Category Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingRiskCategoryCode = 'BUS';

// ─── Rating Scale ─────────────────────────────────────────────────────────────
// First-page visible record (Model Type column). "CoRF Item Group Rating" is always row 1.
export const knownViewableRatingScaleRatingType = 'CoRF Item Group Rating';

export const ratingScaleEditData = {
  updatedLabel: `Label ${suffix}`,
  updatedDescription: `Rating Scale Updated ${new Date(ts).toISOString()}`,
};

// ─── Rating Correction ────────────────────────────────────────────────────────

export const ratingCorrectionData = {
  parameter: `RC Param ${suffix}`,
  criteria: `RC Criteria ${new Date(ts).toISOString()}`,
};

export const ratingCorrectionEditData = {
  updatedCriteria: `RC Criteria Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingRatingCorrectionParam = 'Adverse comments from Auditors';

// ─── Rating Model ─────────────────────────────────────────────────────────────

export const ratingModelData = {
  name: `RM ${suffix}`,
  effectiveDate: '01 Jan 2027',
  modelType: 'NBFC/HFC',
  riskCategory: 'Business Risk',
};

export const ratingModelEditData = {
  updatedName: `RM Updated ${suffix}`,
};

export const knownExistingRatingModelName = 'Banking';
export const knownViewableRatingModelName  = 'Banking copy';
