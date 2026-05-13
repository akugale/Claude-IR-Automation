const xlsx = require('C:/Automation Projects/Projects/Claude IR Automation/node_modules/xlsx');

const filePath = 'C:/Users/Akshay.Ugale/OneDrive - CARE RATINGS LIMITED/Desktop/IR_TC_R1_Rating-Model_UPDATED.xlsx';
const wb = xlsx.readFile(filePath, { cellStyles: true, bookSST: false });

// Remove old sheet if exists
const oldIdx = wb.SheetNames.indexOf('Step 3 - Logic and Validate');
if (oldIdx !== -1) {
  wb.SheetNames.splice(oldIdx, 1);
  delete wb.Sheets['Step 3 - Logic and Validate'];
  console.log('Removed old sheet: Step 3 - Logic and Validate');
}

// Insert new sheet at same position (or at end)
const insertAt = oldIdx !== -1 ? oldIdx : wb.SheetNames.length;

const HEADERS = [
  'Test Case No.', 'Busi Req/Bug #', 'User Case #', 'SRS Ref #', 'Module Name',
  'Screen Name', 'Test Condition', 'Test Data', 'Expected Result', 'Actual Result',
  'Status 1', 'Execution Date', 'Status 2', 'Execution Date', 'Tester name 1',
  'Tester name 2', 'Planned Test Date', 'Actual Test date', 'Ref Case No',
  'Observations/ Recommendations'
];

// Col widths from existing Step 3 sheet (cols 0-19)
const colWidths = [
  { wch: 11.7 }, { wch: 13.1 }, { wch: 10.1 }, { wch: 8 }, { wch: 17.4 },
  { wch: 18.9 }, { wch: 38.3 }, { wch: 34.9 }, { wch: 47.6 }, { wch: 11.4 },
  { wch: 7.1 }, { wch: 13.1 }, { wch: 7.1 }, { wch: 13.1 }, { wch: 12.3 },
  { wch: 12.3 }, { wch: 15.7 }, { wch: 14.1 }, { wch: 10.4 }, { wch: 28.7 }
];

const hdrStyle = {
  patternType: 'solid',
  fgColor: { theme: 2, tint: -0.249977111117893, rgb: 'AFABAB' },
  bgColor: { indexed: 64 }
};
const datStyle = { patternType: 'none' };

// Data rows: [tcNo, screenName, testCondition, testData, expectedResult]
const rows = [
  ['TC_001', 'Set Logic and Validate', 'Navigate to Step 3 from Step 2 via Save and Continue', '', 'Step 3 opens showing 4 tabs: Model Rules, Rating Scale, Summary, Dry Run'],
  ['TC_002', 'Model Rules', 'Navigate to Model Rules tab', '', 'Model Rules tab opens with configured override and notching rules'],
  ['TC_003', 'Model Rules', 'Verify management override rule displayed', '', 'Override threshold (e.g. Management score < 50 = 50% weight) shown'],
  ['TC_004', 'Model Rules', 'Verify entity type notching rule displayed', '', 'Notching rule (e.g. LLP = 1 notch down) shown'],
  ['TC_005', 'Model Rules', 'Verify group support uplift rule displayed if configured', '', 'Group support uplift rule visible'],
  ['TC_006', 'Model Rules', 'Verify rules are read-only if model already submitted', '', 'No editable fields when model in PendingAuthorisation state'],
  ['TC_007', 'Rating Scale', 'Navigate to Rating Scale tab', '', 'Rating Scale tab opens showing score-to-grade cutoff configuration'],
  ['TC_008', 'Rating Scale', 'Configure valid rating scale with no gaps and no overlaps', '0-24=D, 25-49=C, 50-74=BBB, 75-89=AA, 90-100=AAA', 'Rating scale saved successfully'],
  ['TC_009', 'Rating Scale', 'Configure rating scale with gap between bands', '0-24=D, 26-50=C (score 25 missing)', 'Validation error — gap in score range not allowed'],
  ['TC_010', 'Rating Scale', 'Configure rating scale with overlapping bands', '0-30=D, 25-50=C', 'Validation error — overlapping score ranges not allowed'],
  ['TC_011', 'Rating Scale', 'Verify all grade options available (AAA to D)', '', 'Full grade list available for mapping'],
  ['TC_012', 'Rating Scale', 'Save rating scale configuration', 'Valid cutoffs', 'Configuration saved'],
  ['TC_013', 'Summary', 'Navigate to Summary tab', '', 'Summary tab shows complete model configuration overview'],
  ['TC_014', 'Summary', 'Verify Summary shows Model Name and Effective Date', '', 'Model Name and Effective Date displayed correctly'],
  ['TC_015', 'Summary', 'Verify Summary shows all Risk Categories with bucket weights', '', 'All buckets (Management, Financial etc.) with weight % listed'],
  ['TC_016', 'Summary', 'Verify Summary shows sub-parameters per bucket', '', 'Each bucket expanded shows sub-params with individual weights'],
  ['TC_017', 'Summary', 'Verify Summary shows Rating Scale cutoffs', '', 'Score-to-grade mapping shown in Summary'],
  ['TC_018', 'Summary', 'Verify Summary shows Model Rules', '', 'Override and notching rules shown'],
  ['TC_019', 'Summary', 'Verify Summary shows selected Industries/Sectors', '', 'Applicable industries listed'],
  ['TC_020', 'Summary', 'Verify Summary is read-only', '', 'No editable fields in Summary tab'],
  ['TC_021', 'Dry Run', 'Navigate to Dry Run tab', '', 'Dry Run tab opens with parameter list and Run button'],
  ['TC_022', 'Dry Run', 'Verify Dry Run shows message when no parameters configured', '', '"No parameters configured. Add parameters in Step 2 first." message displayed'],
  ['TC_023', 'Dry Run', 'Verify Dry Run loads parameters after Step 2 configured', '', 'All sub-parameters from all risk buckets listed'],
  ['TC_024', 'Dry Run', 'Verify Collapse All button collapses all parameter sections', '', 'All parameter sections collapsed'],
  ['TC_025', 'Dry Run', 'Verify Expand All button expands all parameter sections', '', 'All parameter sections expanded'],
  ['TC_026', 'Dry Run', 'Click Randomize — verify all parameter values auto-filled', '', 'All parameters assigned random valid values'],
  ['TC_027', 'Dry Run', 'Click Run after Randomize — verify output grade shown', '', 'System calculates score and displays simulated rating grade'],
  ['TC_028', 'Dry Run', 'Manually set all params to max score — click Run', 'All params = max value', 'Output grade should be AAA (highest)'],
  ['TC_029', 'Dry Run', 'Manually set all params to min score — click Run', 'All params = min value', 'Output grade should be D (lowest)'],
  ['TC_030', 'Dry Run', 'Set Management param below override threshold — click Run', 'Management score < threshold', 'Override rule fires; Management weight changes to 50%; output grade recalculated'],
  ['TC_031', 'Dry Run', 'Click Run without selecting all parameter values', 'Some params blank', 'Validation error or partial result — verify behavior'],
  ['TC_032', 'Dry Run', 'Verify Dry Run result does not create official rating record', '', 'No entry created in Rating Request list after Dry Run'],
  ['TC_033', 'Set Logic and Validate', 'Click Save as Draft from Step 3', '', 'Model saved with status Saved; user stays on Step 3'],
  ['TC_034', 'Set Logic and Validate', 'Click Save and Submit from Step 3', 'Complete valid config', 'Model status changes to PendingAuthorisation'],
  ['TC_035', 'Set Logic and Validate', 'Click Save and Submit with incomplete configuration', 'Missing Rating Scale or Model Rules', 'Validation error — cannot submit incomplete model'],
  ['TC_036', 'Set Logic and Validate', 'Verify Previous button navigates back to Step 2', '', 'Step 2 opens with previously saved data intact'],
];

const ws = {};

function makeCell(val, style) {
  const t = (val === '' || val === null || val === undefined) ? 's' : 's';
  return { t: 's', v: String(val == null ? '' : val), w: String(val == null ? '' : val), s: style };
}

// Row 1 & 2 are blank — ref starts at A3
// Row 3 = headers (index 2 in 0-based, Excel row 3)
// Row 4+ = data

let maxRow = 3; // will track last populated row (1-based)

// Write header row (row 3)
HEADERS.forEach((h, ci) => {
  const cellAddr = xlsx.utils.encode_cell({ r: 2, c: ci }); // r=2 => row 3
  ws[cellAddr] = { t: 's', v: h, w: h, s: hdrStyle };
});

// Write data rows starting at row 4 (r=3)
rows.forEach((row, ri) => {
  const excelRow = ri + 3; // 0-based r: 3 = Excel row 4
  maxRow = excelRow + 1;   // track for !ref

  // Col A: TC number
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 0 })] = makeCell(row[0], datStyle);
  // Col B: NA
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 1 })] = makeCell('NA', datStyle);
  // Col C: NA
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 2 })] = makeCell('NA', datStyle);
  // Col D: NA
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 3 })] = makeCell('NA', datStyle);
  // Col E: Module Name
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 4 })] = makeCell('Model Setup>>Rating Model', datStyle);
  // Col F: Screen Name
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 5 })] = makeCell(row[1], datStyle);
  // Col G: Test Condition
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 6 })] = makeCell(row[2], datStyle);
  // Col H: Test Data
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 7 })] = makeCell(row[3], datStyle);
  // Col I: Expected Result
  ws[xlsx.utils.encode_cell({ r: excelRow, c: 8 })] = makeCell(row[4], datStyle);
  // Cols J-T (indices 9-19): blank
  for (let ci = 9; ci <= 19; ci++) {
    ws[xlsx.utils.encode_cell({ r: excelRow, c: ci })] = makeCell('', datStyle);
  }
});

// Set sheet ref: A3 to T(maxRow)
ws['!ref'] = `A3:T${maxRow}`;
ws['!cols'] = colWidths;

// Add sheet to workbook at the correct position
wb.SheetNames.splice(insertAt, 0, 'Step 3 - Logic and Validate v2');
wb.Sheets['Step 3 - Logic and Validate v2'] = ws;

const outPath = 'C:/Users/Akshay.Ugale/Downloads/IR_TC_R1_Rating-Model_UPDATED_new.xlsx';
xlsx.writeFile(wb, outPath, { cellStyles: true });
console.log('Done. Sheet "Step 3 - Logic and Validate v2" written with', rows.length, 'data rows.');
console.log('Sheets now:', wb.SheetNames);
