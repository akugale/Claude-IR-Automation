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

// ─── Risk Categories Group ────────────────────────────────────────────────────
export const riskCategoriesGroupData = {
  code: `RCG${suffix}`,
  description: `Risk Cat Group ${new Date(ts).toISOString()}`,
};

export const riskCategoriesGroupEditData = {
  updatedDescription: `Risk Cat Group Updated ${new Date(ts).toISOString()}`,
};

export const knownExistingRiskCategoriesGroupCode = 'LRD';
