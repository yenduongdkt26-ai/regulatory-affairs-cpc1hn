const https = require('https');

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

function normalizeHeader(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectExportColumns(headerRow) {
  if (!headerRow || !Array.isArray(headerRow)) {
    return { sttCol: -1, inChargeCol: 0, productNameCol: 1, exportNameCol: 2, countryCol: 3, deadlineCol: 4, classificationCol: 5, noteCol: 6 };
  }
  
  const norm = headerRow.map(normalizeHeader);
  
  let inChargeCol = norm.findIndex(h => h.includes("dkt") || h.includes("phu trach"));
  let productNameCol = norm.findIndex(h => h.includes("ten san pham") || h.includes("ten thuoc") || h.includes("san pham"));
  let exportNameCol = norm.findIndex(h => h.includes("ten xuat khau") || (h.includes("xuat khau") && !h.includes("nuoc")));
  let countryCol = norm.findIndex(h => h.includes("nuoc"));
  let deadlineCol = norm.findIndex(h => h.includes("deadline") || (h.includes("han") && !h.includes("qua han")));
  let classificationCol = norm.findIndex(h => h.includes("phan loai"));
  
  let noteCol = norm.findIndex(h => (h.includes("nv dang xu ly") || h.includes("nguoi xu ly") || h.includes("ghi chu") || h.includes("note")) && !h.includes("qua han"));
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

  return { sttCol: hasStt ? sttCol : -1, inChargeCol, productNameCol, exportNameCol, countryCol, deadlineCol, classificationCol, noteCol };
}

const employeeMapping = {
  "le minh dang": "Lê Minh Đăng",
  "tran thi oanh": "Trần Thị Oanh",
  "duong hai yen": "Dương Hải Yến"
};

function normalizeName(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function getMatchedEmployees(inChargeStr) {
  if (!inChargeStr) return [];
  const parts = inChargeStr.split(/[;,/]/).map(p => p.trim()).filter(p => p);
  const matched = [];
  parts.forEach(part => {
    const normalized = normalizeName(part);
    if (employeeMapping[normalized]) {
      matched.push(employeeMapping[normalized]);
    } else if (normalized.includes("khach -exp") || normalized.includes("khach exp") || normalized.includes("khach-exp")) {
      matched.push("Khách -EXP");
    }
  });
  return [...new Set(matched)];
}

const GOOGLE_SHEETS = {
  hsxk: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv",
  nhanDangKy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1614516186&single=true&output=csv",
  nhanSanXuat: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=21836232&single=true&output=csv"
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  for (const [key, url] of Object.entries(GOOGLE_SHEETS)) {
    try {
      const data = await fetchUrl(`${url}&t=${Date.now()}`);
      const rows = parseCSV(data);
      const cols = detectExportColumns(rows[0]);
      console.log(`\n=== SHEET: ${key} ===`);
      rows.forEach((r, i) => {
        const lineStr = r.join(' | ');
        if (lineStr.toLowerCase().includes('cjel calci') && lineStr.toLowerCase().includes('myanmar')) {
          const combined = [r[cols.inChargeCol], r[cols.noteCol]].filter(Boolean).join("; ");
          const matched = getMatchedEmployees(combined);
          console.log(`Row ${i}:`, {
            productName: r[cols.productNameCol],
            exportName: r[cols.exportNameCol],
            country: r[cols.countryCol],
            deadline: r[cols.deadlineCol],
            inChargeColRaw: r[cols.inChargeCol],
            noteColRaw: r[cols.noteCol],
            matched
          });
        }
      });
    } catch (e) {
      console.error(`Error ${key}:`, e.message);
    }
  }
}

run();
