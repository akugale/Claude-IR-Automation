const XLSX = require('./node_modules/xlsx');
const path = require('path');

const srcFile = 'C:\\Users\\Akshay.Ugale\\OneDrive - CARE RATINGS LIMITED\\Desktop\\IR_TC_R1_Rating-Model_UPDATED.xlsx';
const fallbackSrc = 'C:\\Users\\Akshay.Ugale\\OneDrive - CARE RATINGS LIMITED\\Desktop\\IR_TC_R1_Rating-Model.xlsx';
const outFile = 'C:\\Users\\Akshay.Ugale\\OneDrive - CARE RATINGS LIMITED\\Desktop\\IR_TC_R1_Rating-Model_UPDATED.xlsx';
const outFileV2 = 'C:\\Users\\Akshay.Ugale\\OneDrive - CARE RATINGS LIMITED\\Desktop\\IR_TC_R1_Rating-Model_UPDATED_v2.xlsx';

const fs = require('fs');

// Determine source file
let inputFile = fs.existsSync(srcFile) ? srcFile : fallbackSrc;
console.log('Reading from:', inputFile);

const wb = XLSX.readFile(inputFile, { cellStyles: true, bookVBA: true });

// Remove sheet if it already exists
const sheetName = 'Rating Request - Initiate';
if (wb.SheetNames.includes(sheetName)) {
  const idx = wb.SheetNames.indexOf(sheetName);
  wb.SheetNames.splice(idx, 1);
  delete wb.Sheets[sheetName];
  console.log('Removed existing sheet:', sheetName);
}

// Build new worksheet
const ws = {};

// Headers row 3 (index 2)
const headers = [
  'Test Case No.', 'Busi Req/Bug #', 'User Case #', 'SRS Ref #', 'Module Name',
  'Screen Name', 'Test Condition', 'Test Data', 'Expected Result', 'Actual Result',
  'Status 1', 'Execution Date', 'Status 2', 'Execution Date', 'Tester name 1',
  'Tester name 2', 'Planned Test Date', 'Actual Test date', 'Ref Case No',
  'Observations/ Recommendations'
];

headers.forEach((h, ci) => {
  const addr = XLSX.utils.encode_cell({ r: 2, c: ci });
  ws[addr] = { t: 's', v: h };
});

// Data rows — module name is always "Rating>>Rating Request"
const MODULE = 'Rating>>Rating Request';

const rows = [
  ['TC_001', 'Create Initiate', 'Navigate to Rating Request → Initiate', '', 'Create Initiate screen opens with table'],
  ['TC_002', 'Create Initiate', 'Verify table columns visible', '', 'Table shows: Proposal No, Company Name, Company Name for Financials, Model, Currency, Branch, Year, Actions'],
  ['TC_003', 'Create Initiate', 'Verify PDF export button visible', '', 'Red PDF icon visible top-right'],
  ['TC_004', 'Create Initiate', 'Verify Excel export button visible', '', 'Green Excel icon visible top-right'],
  ['TC_005', 'Create Initiate', 'Verify + Add button visible', '', '+ button visible top-right'],
  ['TC_006', 'Create Initiate', 'Verify default pagination = 20', '', 'Items per page shows 20 by default'],
  ['TC_007', 'Create Initiate', 'Verify empty state message when no records', '', 'Showing 1-10 out of 0 records message displayed'],
  ['TC_008', 'Create Initiate', 'Sort by Proposal No ascending and descending', '', 'Records sort correctly in both directions'],
  ['TC_009', 'Create Initiate', 'Sort by Company Name', '', 'Alphabetical sort correct'],
  ['TC_010', 'Create Initiate', 'Sort by Model', '', 'Sort works correctly'],
  ['TC_011', 'Create Initiate', 'Sort by Currency', '', 'Sort works correctly'],
  ['TC_012', 'Create Initiate', 'Sort by Branch', '', 'Sort works correctly'],
  ['TC_013', 'Create Initiate', 'Sort by Year', '', 'Year sort correct'],
  ['TC_014', 'Create Initiate', 'Filter by Proposal No column', 'Valid proposal no', 'Only matching records shown; filter active indicator visible'],
  ['TC_015', 'Create Initiate', 'Filter by Company Name column', 'Company name', 'Filtered correctly; active indicator shown'],
  ['TC_016', 'Create Initiate', 'Filter by Model column', 'Model name', 'Filtered correctly'],
  ['TC_017', 'Create Initiate', 'Filter by Branch column', 'Branch name', 'Filtered correctly'],
  ['TC_018', 'Create Initiate', 'Filter by Year column', 'Year value', 'Filtered correctly'],
  ['TC_019', 'Create Initiate', 'Clear filter restores all records', '', 'All records visible after clearing filter'],
  ['TC_020', 'Create Initiate', 'Export PDF downloads file', '', 'PDF downloads with all records'],
  ['TC_021', 'Create Initiate', 'Export Excel downloads file', '', 'Excel downloads with all records'],
  ['TC_022', 'Evaluation Details', 'Click + button to open create modal', '', 'Evaluation Details modal opens'],
  ['TC_023', 'Evaluation Details', 'Verify all fields visible in modal', '', 'Fields present: Proposal No, Company Name, Company Name For Financials, Branch, Currency, Model, Rating Year, Independent Rating model checkbox'],
  ['TC_024', 'Evaluation Details', 'Enter valid Proposal No', 'PROP-2025-001', 'Accepted and saved'],
  ['TC_025', 'Evaluation Details', 'Leave Proposal No blank and click Add', 'NULL', 'Validation error — Proposal No is required'],
  ['TC_026', 'Evaluation Details', 'Enter duplicate Proposal No', 'Existing proposal no', 'Error — duplicate Proposal No not allowed'],
  ['TC_027', 'Evaluation Details', 'Select valid Company Name', 'Existing company', 'Company selected successfully'],
  ['TC_028', 'Evaluation Details', 'Leave Company Name blank and click Add', 'NULL', 'Validation error — Company Name is required'],
  ['TC_029', 'Evaluation Details', 'Select Company Name For Financials — same as Company Name', 'Same company', 'Accepted — same entity is valid scenario'],
  ['TC_030', 'Evaluation Details', 'Select Company Name For Financials — different from Company Name', 'Different company', 'Accepted — group entity scenario'],
  ['TC_031', 'Evaluation Details', 'Leave Company Name For Financials blank and click Add', 'NULL', 'Validation error or auto-fill — verify behavior'],
  ['TC_032', 'Evaluation Details', 'Select valid Branch', 'Valid branch value', 'Branch selected'],
  ['TC_033', 'Evaluation Details', 'Leave Branch blank and click Add', 'NULL', 'Validation error — Branch is required'],
  ['TC_034', 'Evaluation Details', 'Select valid Currency', 'INR', 'Currency selected'],
  ['TC_035', 'Evaluation Details', 'Leave Currency blank and click Add', 'NULL', 'Validation error — Currency is required'],
  ['TC_036', 'Evaluation Details', 'Select valid Model from dropdown', 'Active authorised model', 'Model selected'],
  ['TC_037', 'Evaluation Details', 'Leave Model blank and click Add', 'NULL', 'Validation error — Model is required'],
  ['TC_038', 'Evaluation Details', 'Verify only Authorised models appear in Model dropdown', '', 'De-authorised and Saved models not available for selection'],
  ['TC_039', 'Evaluation Details', 'Select valid Rating Year', '2024-25', 'Rating Year selected'],
  ['TC_040', 'Evaluation Details', 'Leave Rating Year blank and click Add', 'NULL', 'Validation error — Rating Year is required'],
  ['TC_041', 'Evaluation Details', 'Verify Independent Rating model checkbox default state', '', 'Checkbox unchecked by default'],
  ['TC_042', 'Evaluation Details', 'Check Independent Rating model checkbox', 'Checked', 'Checkbox checked; applicable behavior triggered'],
  ['TC_043', 'Evaluation Details', 'Fill all fields and click Reset', 'All fields filled', 'All fields cleared; form reset to blank state'],
  ['TC_044', 'Evaluation Details', 'Click Add with all valid data', 'All valid inputs', 'Modal closes; new record appears in Initiate list'],
  ['TC_045', 'Evaluation Details', 'Verify new record shows correct Proposal No', '', 'Proposal No in table matches entered value'],
  ['TC_046', 'Evaluation Details', 'Verify new record shows correct Company Name', '', 'Company Name correct in table row'],
  ['TC_047', 'Evaluation Details', 'Verify new record shows correct Model', '', 'Model correct in table row'],
  ['TC_048', 'Evaluation Details', 'Verify new record shows correct Rating Year', '', 'Rating Year correct in table row'],
  ['TC_049', 'Evaluation Details', 'Verify new record shows correct Branch', '', 'Branch correct in table row'],
  ['TC_050', 'Evaluation Details', 'Click Add with all fields blank', 'NULL', 'All required field validation errors shown simultaneously'],
  ['TC_051', 'Evaluation Details', 'Close modal via X button', '', 'Modal closes; no record created'],
  ['TC_052', 'Create Initiate', 'Verify Actions column has action buttons per row', 'Existing record', 'Action buttons visible for each record row'],
  ['TC_053', 'Create Initiate', 'View action opens record in read-only mode', '', 'Record details visible; no editable fields'],
  ['TC_054', 'Create Initiate', 'Delete action on initiated record shows confirmation', '', 'Confirmation dialog shown before deletion'],
  ['TC_055', 'Create Initiate', 'Confirm delete — record removed from list', '', 'Record no longer visible in Initiate list'],
  ['TC_056', 'Create Initiate', 'Cancel delete — record retained in list', '', 'Record still present after cancel'],
  ['TC_057', 'Create Initiate', 'Initiated record appears in Process screen', '', 'Same record visible under Rating Request → Process'],
  ['TC_058', 'Create Initiate', 'Initiated record appears in Pending screen', '', 'Record visible in Rating Request → Pending queue'],
  ['TC_059', 'Create Initiate', 'Proposal No is unique identifier traceable across sub-screens', '', 'Same Proposal No visible and traceable in Process, View Rating, and other sub-screens'],
];

rows.forEach((row, ri) => {
  const excelRow = ri + 3; // data starts at row 4 (index 3)
  const [tcNo, screenName, testCondition, testData, expectedResult] = row;

  // Col A: TC No
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 0 })] = { t: 's', v: tcNo };
  // Col B: NA
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 1 })] = { t: 's', v: 'NA' };
  // Col C: NA
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 2 })] = { t: 's', v: 'NA' };
  // Col D: NA
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 3 })] = { t: 's', v: 'NA' };
  // Col E: Module Name
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 4 })] = { t: 's', v: MODULE };
  // Col F: Screen Name
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 5 })] = { t: 's', v: screenName };
  // Col G: Test Condition
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 6 })] = { t: 's', v: testCondition };
  // Col H: Test Data (blank if empty string)
  if (testData && testData !== '') {
    ws[XLSX.utils.encode_cell({ r: excelRow, c: 7 })] = { t: 's', v: testData };
  }
  // Col I: Expected Result
  ws[XLSX.utils.encode_cell({ r: excelRow, c: 8 })] = { t: 's', v: expectedResult };
  // Cols J-T (indices 9-19): blank — leave unset
});

// Set sheet range: rows 1-62 (0-indexed 0 to 61), cols A-T (0 to 19)
ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: 61, c: 19 });

// Match column widths from Rating Models List
ws['!cols'] = [
  { wpx: 150 }, // A
  { wpx: 150 }, // B
  { wpx: 150 }, // C
  { wpx: 150 }, // D
  { wpx: 150 }, // E
  { wpx: 181 }, // F - Screen Name (wider)
  { wpx: 211 }, // G - Test Condition (wider)
  { wpx: 150 }, // H
  { wpx: 232 }, // I - Expected Result (wider)
  { wpx: 150 }, // J
  { wpx: 150 }, // K
  { wpx: 150 }, // L
  { wpx: 150 }, // M
  { wpx: 150 }, // N
  { wpx: 150 }, // O
  { wpx: 150 }, // P
  { wpx: 150 }, // Q
  { wpx: 150 }, // R
  { wpx: 150 }, // S
  { wpx: 150 }, // T
];

// Add sheet to workbook
wb.SheetNames.push(sheetName);
wb.Sheets[sheetName] = ws;

// Try saving to primary output path, fall back to v2
let savedPath = outFile;
try {
  XLSX.writeFile(wb, outFile, { cellStyles: true, bookType: 'xlsx' });
  console.log('Saved to:', outFile);
} catch (err) {
  console.warn('Primary save failed:', err.message, '\nTrying v2 path...');
  savedPath = outFileV2;
  XLSX.writeFile(wb, outFileV2, { cellStyles: true, bookType: 'xlsx' });
  console.log('Saved to:', outFileV2);
}

// Verify
const verify = XLSX.readFile(savedPath);
console.log('\nVerification:');
console.log('Sheets in saved file:', verify.SheetNames);
const newWs = verify.Sheets[sheetName];
const range = XLSX.utils.decode_range(newWs['!ref']);
console.log('New sheet range:', newWs['!ref']);
console.log('Total rows in range:', range.e.r + 1);

// Count data rows written
let dataRows = 0;
for (let r = 3; r <= range.e.r; r++) {
  if (newWs[XLSX.utils.encode_cell({ r, c: 0 })]) dataRows++;
}
console.log('Data rows written (TC entries):', dataRows);

// Sample check
const sampleCells = ['A4', 'B4', 'E4', 'F4', 'G4', 'I4', 'A62', 'F62', 'G62', 'I62'];
sampleCells.forEach(addr => {
  const cell = newWs[addr];
  console.log(addr, ':', cell ? cell.v : '(blank)');
});
