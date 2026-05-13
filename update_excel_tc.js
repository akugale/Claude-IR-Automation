const XLSX = require('C:/Automation Projects/Projects/Claude IR Automation/node_modules/xlsx');

const FILE_PATH = 'C:/Users/Akshay.Ugale/OneDrive - CARE RATINGS LIMITED/Desktop/IR_TC_R1_Rating-Model.xlsx';
const MODULE = 'Model Setup>>Rating Model';

const wb = XLSX.readFile(FILE_PATH);

// ─── TASK 1: Fill Model Report TC_011–TC_039 ─────────────────────────────────
const mrData = [
  ['TC_011', 'Verify report shows Model Type', '', 'Model Type displayed correctly in report'],
  ['TC_012', 'Verify report shows Effective Date', '', 'Effective Date shown accurately'],
  ['TC_013', 'Verify report shows Workflow Status', '', 'Current status (Authorised / Saved / PendingAuthorisation) displayed'],
  ['TC_014', 'Verify report lists all configured Risk Categories', '', 'All risk categories shown in report'],
  ['TC_015', 'Verify Management Risk sub-parameters and weights in report', '', 'All Management Risk params with weight % displayed'],
  ['TC_016', 'Verify Financial Risk sub-parameters and weights in report', '', 'All Financial Risk params with weight % displayed'],
  ['TC_017', 'Verify Business/Operational Risk sub-parameters in report', '', 'All Operational Risk params shown'],
  ['TC_018', 'Verify Industry Risk sub-parameters in report', '', 'All Industry Risk params shown'],
  ['TC_019', 'Verify rating scale / score-to-grade cutoffs shown in report', '', 'Score range to rating grade mapping displayed'],
  ['TC_020', 'Verify management override rule shown in report', '', 'Override threshold and rule displayed'],
  ['TC_021', 'Verify Notching Type shown in report', '', 'Notching type (e.g. Not Applicable) displayed'],
  ['TC_022', 'Verify applicable industries/sectors listed in report', '', 'All selected industries shown'],
  ['TC_023', 'Verify Created By and Created On shown in report', '', 'Audit fields visible and correct'],
  ['TC_024', 'Verify Modified By and Modified On shown in report', '', 'Modification audit fields visible'],
  ['TC_025', 'Verify report is read-only', '', 'No editable input fields in report view'],
  ['TC_026', 'Verify report for Authorised model', '', 'Authorised status shown correctly'],
  ['TC_027', 'Verify report for PendingAuthorisation model', '', 'PendingAuthorisation status shown'],
  ['TC_028', 'Verify report for Saved (draft) model', '', 'Saved status shown'],
  ['TC_029', 'Download report as PDF', '', 'PDF downloads with full model configuration details'],
  ['TC_030', 'Download report as Excel', '', 'Excel downloads with all model data'],
  ['TC_031', 'Verify PDF report content matches UI data', '', 'PDF data identical to displayed report'],
  ['TC_032', 'Verify Excel report content matches UI data', '', 'Excel data identical to displayed report'],
  ['TC_033', 'Verify Risk Category bucket weights shown in report', '', 'Bucket weights (e.g. Management 20%, Financial 35%) displayed'],
  ['TC_034', 'Verify sub-parameter score options shown in report', '', 'Score options/ranges for each sub-parameter listed'],
  ['TC_035', 'Verify model name shown in report header', '', 'Model name displayed in report title/header section'],
  ['TC_036', 'Verify report accessible via view action from model list', '', 'Clicking view on model row opens the report'],
  ['TC_037', 'Verify back navigation from report to list', '', 'User can navigate back to Rating Models List from report'],
  ['TC_038', 'Verify copied model report matches source model', '', 'All config in copied model report identical to source'],
  ['TC_039', 'Verify report reflects latest saved changes after edit', '', 'After edit and save, report shows updated data'],
];

const mrSheet = wb.Sheets['Model Report'];
// Header is row 1, TC_001 is row 2, TC_011 is row 12 (Excel row index)
// sheet_to_json with header:1 gives 0-indexed arrays; TC_011 is at array index 11 → Excel row 12
mrData.forEach((item, idx) => {
  const excelRow = 12 + idx; // TC_011 starts at Excel row 12
  const tcNo = item[0];
  const condition = item[1];
  const testData = item[2];
  const expected = item[3];

  const setCellStr = (col, val) => {
    const addr = col + excelRow;
    if (val === '') {
      // leave blank - don't set
      return;
    }
    mrSheet[addr] = { t: 's', v: val };
  };

  // A already has TC number, B and C already have NA from inspection
  // Set E (Module), F (Screen), G (Condition), H (Test Data), I (Expected)
  setCellStr('E', MODULE);
  setCellStr('F', 'Model Report');
  setCellStr('G', condition);
  // H = test data (blank per spec)
  setCellStr('I', expected);
});

console.log('Task 1: Filled Model Report TC_011-TC_039 (29 rows)');

// ─── Helper: build new sheet with 2 blank rows + header row 3 + data ─────────
const HEADERS = [
  'Test Case No.', 'Busi Req/Bug #', 'User Case #', 'SRS Ref #',
  'Module Name', 'Screen Name', 'Test Condition', 'Test Data',
  'Expected Result', 'Actual Result', 'Status 1', 'Execution Date',
  'Status 2', 'Execution Date', 'Tester name 1', 'Tester name 2',
  'Planned Test Date', 'Actual Test date', 'Ref Case No',
  'Observations/ Recommendations'
];

function buildSheet(rows) {
  // rows: array of { tc, screenName, condition, testData, expected }
  const aoa = [
    [], // row 1 blank
    [], // row 2 blank
    HEADERS, // row 3 headers
    ...rows.map(r => [
      r.tc, 'NA', 'NA', 'NA', MODULE, r.screenName,
      r.condition, r.testData, r.expected,
      '', '', '', '', '', '', '', '', '', '', ''
    ])
  ];
  return XLSX.utils.aoa_to_sheet(aoa);
}

// ─── TASK 2: Step 2 - Risk Tabs ───────────────────────────────────────────────
const step2Rows = [
  { tc: 'TC_001', screenName: 'Management Risk', condition: 'Navigate to Management Risk tab in Step 2', testData: '', expected: 'Tab opens with Management Risk sub-parameters listed' },
  { tc: 'TC_002', screenName: 'Management Risk', condition: 'Verify all Management Risk sub-parameters are listed', testData: '', expected: 'All configured Management Risk parameters visible' },
  { tc: 'TC_003', screenName: 'Management Risk', condition: 'Enter valid sub-parameter weights summing to 100%', testData: 'Weights summing to 100', expected: 'Weights accepted and saved successfully' },
  { tc: 'TC_004', screenName: 'Management Risk', condition: 'Enter sub-parameter weights not summing to 100%', testData: 'Weights summing to 90', expected: 'Validation error — sub-parameter weights must total 100%' },
  { tc: 'TC_005', screenName: 'Management Risk', condition: 'Enter negative weight value for a sub-parameter', testData: '-10', expected: 'Validation error — negative weight not allowed' },
  { tc: 'TC_006', screenName: 'Management Risk', condition: 'Enter non-numeric value in weight field', testData: 'ABC', expected: 'Field should reject non-numeric input' },
  { tc: 'TC_007', screenName: 'Management Risk', condition: 'Configure score options for sub-parameter', testData: 'Valid score options', expected: 'Score options saved correctly' },
  { tc: 'TC_008', screenName: 'Management Risk', condition: 'Verify management override threshold configurable', testData: 'Threshold = 50', expected: 'Override threshold field visible and editable' },
  { tc: 'TC_009', screenName: 'Management Risk', condition: 'Save Management Risk configuration', testData: 'Valid weights and scores', expected: 'Configuration saved as draft' },
  { tc: 'TC_010', screenName: 'Management Risk', condition: 'Verify Management Risk data persists on tab switch', testData: '', expected: 'Data retained when navigating to other tabs and back' },
  { tc: 'TC_011', screenName: 'Business/Operational Risk', condition: 'Navigate to Business/Operational Risk tab', testData: '', expected: 'Tab opens with Operational Risk sub-parameters listed' },
  { tc: 'TC_012', screenName: 'Business/Operational Risk', condition: 'Verify all Business/Operational Risk sub-parameters listed', testData: '', expected: 'All configured Operational Risk params visible' },
  { tc: 'TC_013', screenName: 'Business/Operational Risk', condition: 'Enter valid sub-parameter weights summing to 100%', testData: 'Weights = 100', expected: 'Accepted and saved' },
  { tc: 'TC_014', screenName: 'Business/Operational Risk', condition: 'Enter sub-parameter weights not summing to 100%', testData: 'Weights = 85', expected: 'Validation error' },
  { tc: 'TC_015', screenName: 'Business/Operational Risk', condition: 'Configure score options for sub-parameters', testData: 'Valid options', expected: 'Saved correctly' },
  { tc: 'TC_016', screenName: 'Business/Operational Risk', condition: 'Verify data persists on tab switch', testData: '', expected: 'Data retained on tab navigation' },
  { tc: 'TC_017', screenName: 'Financial Risk', condition: 'Navigate to Financial Risk tab', testData: '', expected: 'Tab opens with Financial Risk sub-parameters listed' },
  { tc: 'TC_018', screenName: 'Financial Risk', condition: 'Verify all Financial Risk sub-parameters listed', testData: '', expected: 'All configured Financial Risk params visible' },
  { tc: 'TC_019', screenName: 'Financial Risk', condition: 'Enter valid sub-parameter weights summing to 100%', testData: 'Weights = 100', expected: 'Accepted and saved' },
  { tc: 'TC_020', screenName: 'Financial Risk', condition: 'Enter sub-parameter weights not summing to 100%', testData: 'Weights = 80', expected: 'Validation error' },
  { tc: 'TC_021', screenName: 'Financial Risk', condition: 'Configure score options for financial sub-parameters', testData: 'Valid options', expected: 'Saved correctly' },
  { tc: 'TC_022', screenName: 'Financial Risk', condition: 'Verify data persists on tab switch', testData: '', expected: 'Data retained' },
  { tc: 'TC_023', screenName: 'Industry Risk', condition: 'Navigate to Industry Risk tab', testData: '', expected: 'Tab opens with Industry Risk sub-parameters listed' },
  { tc: 'TC_024', screenName: 'Industry Risk', condition: 'Verify all Industry Risk sub-parameters listed', testData: '', expected: 'All params visible' },
  { tc: 'TC_025', screenName: 'Industry Risk', condition: 'Enter valid sub-parameter weights summing to 100%', testData: 'Weights = 100', expected: 'Accepted' },
  { tc: 'TC_026', screenName: 'Industry Risk', condition: 'Enter sub-parameter weights not summing to 100%', testData: 'Weights = 70', expected: 'Validation error' },
  { tc: 'TC_027', screenName: 'Industry Risk', condition: 'Verify data persists on tab switch', testData: '', expected: 'Data retained' },
  { tc: 'TC_028', screenName: 'Project Risk', condition: 'Navigate to Project Risk tab', testData: '', expected: 'Tab opens with Project Risk sub-parameters listed' },
  { tc: 'TC_029', screenName: 'Project Risk', condition: 'Verify all Project Risk sub-parameters listed', testData: '', expected: 'All params visible' },
  { tc: 'TC_030', screenName: 'Project Risk', condition: 'Enter valid sub-parameter weights summing to 100%', testData: 'Weights = 100', expected: 'Accepted' },
  { tc: 'TC_031', screenName: 'Project Risk', condition: 'Verify data persists on tab switch', testData: '', expected: 'Data retained' },
];

const step2Sheet = buildSheet(step2Rows);
XLSX.utils.book_append_sheet(wb, step2Sheet, 'Step 2 - Risk Tabs');
console.log('Task 2: Added "Step 2 - Risk Tabs" with', step2Rows.length, 'data rows');

// ─── TASK 3: Step 3 - Logic and Validate ──────────────────────────────────────
const step3Rows = [
  { tc: 'TC_001', screenName: 'Set Logic and Validate', condition: 'Navigate to Step 3 from Step 2 via Save and Continue', testData: '', expected: 'Step 3 — Set Logic and Validate screen opens' },
  { tc: 'TC_002', screenName: 'Set Logic and Validate', condition: 'Verify rating scale / score-to-grade cutoff section visible', testData: '', expected: 'Rating scale configuration section displayed' },
  { tc: 'TC_003', screenName: 'Set Logic and Validate', condition: 'Configure valid rating scale with no gaps and no overlaps', testData: '0-24=D, 25-49=C, 50-74=BBB, 75-89=AA, 90-100=AAA', expected: 'Rating scale saved successfully' },
  { tc: 'TC_004', screenName: 'Set Logic and Validate', condition: 'Configure rating scale with gap between bands', testData: '0-24=D, 26-50=C (score 25 missing)', expected: 'Validation error — gap in score range not allowed' },
  { tc: 'TC_005', screenName: 'Set Logic and Validate', condition: 'Configure rating scale with overlapping bands', testData: '0-30=D, 25-50=C (overlap at 25-30)', expected: 'Validation error — overlapping score ranges not allowed' },
  { tc: 'TC_006', screenName: 'Set Logic and Validate', condition: 'Verify bucket-level weights sum = 100% validation', testData: 'Weights summing to 100', expected: 'Validation passes' },
  { tc: 'TC_007', screenName: 'Set Logic and Validate', condition: 'Verify bucket-level weights sum not equal 100% throws error', testData: 'Weights summing to 90', expected: 'Validation error — bucket weights must total 100%' },
  { tc: 'TC_008', screenName: 'Set Logic and Validate', condition: 'Click Validate with all valid configuration', testData: 'Complete valid config', expected: 'Validation succeeds; Submit button enabled' },
  { tc: 'TC_009', screenName: 'Set Logic and Validate', condition: 'Click Validate with incomplete or invalid configuration', testData: 'Missing required data', expected: 'Error list displayed; Submit button disabled' },
  { tc: 'TC_010', screenName: 'Set Logic and Validate', condition: 'Submit model (Maker) after successful validation', testData: 'Complete valid config', expected: 'Model status changes to PendingAuthorisation' },
  { tc: 'TC_011', screenName: 'Set Logic and Validate', condition: 'Save model as draft from Step 3 (click Save)', testData: '', expected: 'Status remains Saved; user stays on Step 3' },
  { tc: 'TC_012', screenName: 'Set Logic and Validate', condition: 'Navigate back to Step 2 from Step 3', testData: '', expected: 'Step 2 opens with previously saved data intact' },
  { tc: 'TC_013', screenName: 'Set Logic and Validate', condition: 'Navigate back to Step 1 from Step 3', testData: '', expected: 'Step 1 opens with previously saved data intact' },
  { tc: 'TC_014', screenName: 'Set Logic and Validate', condition: 'Verify stepper — Step 3 active, Steps 1 and 2 shown as completed', testData: '', expected: 'Step 3 highlighted; Steps 1 and 2 show completion state' },
  { tc: 'TC_015', screenName: 'Set Logic and Validate', condition: 'Submit without completing all required Step 2 tabs', testData: 'Incomplete Step 2 data', expected: 'Validation error — all required sections must be completed before submit' },
  { tc: 'TC_016', screenName: 'Set Logic and Validate', condition: 'Verify management override rule configurable in logic', testData: 'Override threshold value', expected: 'Threshold field editable; saved and applied correctly' },
  { tc: 'TC_017', screenName: 'Set Logic and Validate', condition: 'Verify entity type notching rule visible', testData: 'Entity type = LLP', expected: 'Notching rule shown; 1 notch down applied to final rating' },
];

const step3Sheet = buildSheet(step3Rows);
XLSX.utils.book_append_sheet(wb, step3Sheet, 'Step 3 - Logic and Validate');
console.log('Task 3: Added "Step 3 - Logic and Validate" with', step3Rows.length, 'data rows');

// ─── TASK 4: Maker Checker Auth ───────────────────────────────────────────────
const mcaRows = [
  { tc: 'TC_001', screenName: 'Rating Model - Auth', condition: 'Maker submits model — verify status changes to PendingAuthorisation', testData: '', expected: 'Workflow Status = PendingAuthorisation in Rating Models List' },
  { tc: 'TC_002', screenName: 'Rating Model - Auth', condition: 'Checker navigates to Rating Model - Auth screen', testData: '', expected: 'Only PendingAuthorisation models shown' },
  { tc: 'TC_003', screenName: 'Rating Model - Auth', condition: 'Checker opens a pending model', testData: '', expected: 'All 3 steps shown in read-only view' },
  { tc: 'TC_004', screenName: 'Rating Model - Auth', condition: 'Checker approves model', testData: '', expected: 'Model status changes to Authorised; model becomes active' },
  { tc: 'TC_005', screenName: 'Rating Model - Auth', condition: 'Verify Authorised model appears in Rating Models List', testData: '', expected: 'Model visible with Authorised status badge' },
  { tc: 'TC_006', screenName: 'Rating Model - Auth', condition: 'Checker rejects model with rejection reason', testData: 'Valid rejection reason text', expected: 'Status back to Saved; rejection reason visible to Maker' },
  { tc: 'TC_007', screenName: 'Rating Model - Auth', condition: 'Checker rejects model without entering reason', testData: 'NULL', expected: 'Validation error — rejection reason is mandatory' },
  { tc: 'TC_008', screenName: 'Rating Model - Auth', condition: 'Maker edits model after rejection', testData: '', expected: 'All Step 1/2/3 fields editable after rejection' },
  { tc: 'TC_009', screenName: 'Rating Model - Auth', condition: 'Maker resubmits model after editing', testData: '', expected: 'Status changes to PendingAuthorisation again' },
  { tc: 'TC_010', screenName: 'Rating Model - Auth', condition: 'Verify Maker cannot approve own submitted model', testData: '', expected: 'Approve action not available to the user who submitted the model' },
  { tc: 'TC_011', screenName: 'Rating Model - De Auth', condition: 'Maker initiates de-authorisation of an active model', testData: '', expected: 'Status changes to PendingDeAuthorisation' },
  { tc: 'TC_012', screenName: 'Rating Model - De Auth', condition: 'Checker navigates to Rating Model - De Auth screen', testData: '', expected: 'De-authorisation pending request visible' },
  { tc: 'TC_013', screenName: 'Rating Model - De Auth', condition: 'Checker approves de-authorisation', testData: '', expected: 'Model becomes de-authorised / deactivated' },
  { tc: 'TC_014', screenName: 'Rating Model - De Auth', condition: 'Checker rejects de-authorisation', testData: '', expected: 'Model remains active with Authorised status' },
  { tc: 'TC_015', screenName: 'Rating Model - De Auth', condition: 'Verify de-authorised model cannot be used in rating case', testData: '', expected: 'System prevents selection of de-authorised model in rating workflow' },
];

const mcaSheet = buildSheet(mcaRows);
XLSX.utils.book_append_sheet(wb, mcaSheet, 'Maker Checker Auth');
console.log('Task 4: Added "Maker Checker Auth" with', mcaRows.length, 'data rows');

// ─── Save workbook ────────────────────────────────────────────────────────────
XLSX.writeFile(wb, FILE_PATH);
console.log('\nFile saved successfully to:', FILE_PATH);
console.log('Final sheet list:', wb.SheetNames.join(', '));
