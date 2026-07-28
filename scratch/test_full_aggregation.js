function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

function normalizeName(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();
}

function normalizeHeader(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectExportColumns(headerRow) {
  if (!headerRow || !Array.isArray(headerRow)) {
    return { sttCol: 0, inChargeCol: 1, productNameCol: 2, exportNameCol: 3, countryCol: 4, deadlineCol: 5, classificationCol: 6, noteCol: 7 };
  }
  
  const norm = headerRow.map(normalizeHeader);
  
  let inChargeCol = norm.findIndex(h => h.includes("dkt") || h.includes("phu trach"));
  let productNameCol = norm.findIndex(h => h.includes("ten san pham") || h.includes("ten thuoc") || h.includes("san pham"));
  let exportNameCol = norm.findIndex(h => h.includes("ten xuat khau") || (h.includes("xuat khau") && !h.includes("nuoc")));
  let countryCol = norm.findIndex(h => h.includes("nuoc"));
  let deadlineCol = norm.findIndex(h => h.includes("deadline") || h.includes("han"));
  let classificationCol = norm.findIndex(h => h.includes("phan loai"));
  let noteCol = norm.findIndex(h => h.includes("note") || h.includes("ghi chu") || h.includes("qua han") || h.includes("nv dang xu ly"));
  let sttCol = norm.findIndex(h => h === "stt");

  const hasStt = sttCol !== -1 || (norm[0] && norm[0] === "stt");
  const offset = hasStt ? 1 : 0;

  if (inChargeCol === -1) inChargeCol = offset + 0;
  if (productNameCol === -1) productNameCol = offset + 1;
  if (exportNameCol === -1) exportNameCol = offset + 2;
  if (countryCol === -1) countryCol = offset + 3;
  if (deadlineCol === -1) deadlineCol = offset + 4;
  if (classificationCol === -1) classificationCol = offset + 5;
  if (noteCol === -1) noteCol = offset + 6;

  return {
    sttCol: hasStt ? sttCol : -1,
    inChargeCol,
    productNameCol,
    exportNameCol,
    countryCol,
    deadlineCol,
    classificationCol,
    noteCol
  };
}

const GOOGLE_SHEETS = {
  employees: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=0&single=true&output=csv",
  hsxk: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv",
  nhanDangKy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1614516186&single=true&output=csv",
  nhanSanXuat: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=21836232&single=true&output=csv"
};

async function testFull() {
  const responses = {};
  for (const [key, url] of Object.entries(GOOGLE_SHEETS)) {
    const res = await fetch(`${url}&t=${Date.now()}`);
    responses[key] = await res.text();
  }

  const employeeLines = parseCSV(responses.employees);
  const employeeList = [];
  const employeeMapping = {};
  for (let i = 1; i < employeeLines.length; i++) {
    const row = employeeLines[i];
    if (row.length < 5 || !row[0]) continue;
    const fullName = row[0].trim();
    employeeList.push({ fullName });
    employeeMapping[normalizeName(fullName)] = fullName;
    [row[1], row[2], row[3]].filter(v => v).forEach(abbr => {
      employeeMapping[normalizeName(abbr.trim())] = fullName;
    });
  }

  function getMatchedEmployees(inChargeStr) {
    if (!inChargeStr) return [];
    const parts = inChargeStr.split(/[;,]/).map(p => p.trim()).filter(p => p);
    const matched = [];
    parts.forEach(part => {
      const normalized = normalizeName(part);
      if (employeeMapping[normalized]) {
        matched.push(employeeMapping[normalized]);
      }
    });
    return [...new Set(matched)];
  }

  // Parse nhanDangKy
  const ndkLines = parseCSV(responses.nhanDangKy);
  const cols = detectExportColumns(ndkLines[0]);
  const ndkData = [];
  for (let i = 1; i < ndkLines.length; i++) {
    const row = ndkLines[i];
    if (row.length <= cols.productNameCol || !row[cols.productNameCol]) continue;
    const matched = getMatchedEmployees(row[cols.inChargeCol]);
    if (matched.length === 0) continue;

    ndkData.push({
      stt: cols.sttCol !== -1 ? row[cols.sttCol] : String(ndkData.length + 1),
      inCharge: matched,
      productName: row[cols.productNameCol].trim(),
      exportName: row[cols.exportNameCol] ? row[cols.exportNameCol].trim() : "",
      country: row[cols.countryCol] ? row[cols.countryCol].trim() : "",
      deadline: row[cols.deadlineCol] ? row[cols.deadlineCol].trim() : "",
      classification: row[cols.classificationCol] ? row[cols.classificationCol].trim() : ""
    });
  }

  console.log("Parsed Nhãn đăng ký count:", ndkData.length);
  console.log("Sample 1:", ndkData[0]);
  console.log("Sample 2:", ndkData[1]);
}

testFull();
