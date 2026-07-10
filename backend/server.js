require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryChatbot } = require('./chatbotHelper');

// RAG Chatbot & Legal Library Helpers
const { executeSync } = require('./crawlerHelper');
const { indexAllDocuments, indexDocument, retrieveRelevantChunks } = require('./indexingHelper');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'regulatory_affairs_secret_key_12345';

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (process.env.DATA_DIR && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'database.json');

const allowedOrigins = [
  'https://regulatoryaffairscpc1hn.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Simple memory-based rate limiter for login
const loginAttempts = {};
function loginRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = [];
  }
  
  // Clean up attempts older than 10 minutes (10 * 60 * 1000)
  loginAttempts[ip] = loginAttempts[ip].filter(timestamp => now - timestamp < 10 * 60 * 1000);
  
  if (loginAttempts[ip].length >= 30) {
    return res.status(429).json({ error: "Bạn đã yêu cầu đăng nhập quá nhiều lần. Vui lòng thử lại sau 10 phút." });
  }
  
  loginAttempts[ip].push(now);
  next();
}

// Google Sheets CSV Export URLs
const GOOGLE_SHEETS = {
  employees: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=0&single=true&output=csv",
  hsxk: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv",
  nhanDangKy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1614516186&single=true&output=csv",
  nhanSanXuat: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=21836232&single=true&output=csv",
  hsbsTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=896924483&single=true&output=csv",
  hsghTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=336185690&single=true&output=csv",
  hsmTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=635241150&single=true&output=csv",
  hstdTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1785319964&single=true&output=csv",
  hsxkCap: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgqEYdBrrFWe4YlLzG6Ossm_RrNVr3cdGUKwBGI43-9WYC9Vq01bhP6PQh0gpVYUAj3vQijYo8PyEm/pub?gid=714926098&single=true&output=csv",
  xepHang: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgqEYdBrrFWe4YlLzG6Ossm_RrNVr3cdGUKwBGI43-9WYC9Vq01bhP6PQh0gpVYUAj3vQijYo8PyEm/pub?gid=661586433&single=true&output=csv"
};

// Memory Cache
let dataCache = {
  timestamp: null,
  data: null,
  customSheets: {}
};

// Helper: Read users from database.json
function readUsers() {
  try {
    const defaultAdmin = [
      {
        "id": "0762334260",
        "employeeName": "Dương Hải Yến",
        "username": "0762334260",
        "password": "0762334260", // Will be hashed on startup!
        "role": "admin",
        "isFirstLogin": true
      }
    ];

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultAdmin, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    let parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = defaultAdmin;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error("Error reading DB:", err);
    return [];
  }
}

// Helper: Write users to database.json
function writeUsers(users) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing DB:", err);
  }
}

// Auto-hashing for initial plain passwords
function hashPlainPasswords() {
  const users = readUsers();
  let modified = false;

  // Migration for Admin phone change
  const adminIdx = users.findIndex(u => u.username === '0762334260' || u.username === '0999999999');
  if (adminIdx !== -1) {
    const adminUser = users[adminIdx];
    const resetFile = path.join(DATA_DIR, '.admin_reset_v3');
    if (!fs.existsSync(resetFile)) {
      adminUser.id = '0762334260';
      adminUser.username = '0762334260';
      adminUser.password = bcrypt.hashSync('0762334260', 10); // Hash directly
      adminUser.isFirstLogin = true;
      try {
        fs.writeFileSync(resetFile, 'done');
      } catch (e) {
        console.error("Failed to write reset flag:", e);
      }
      modified = true;
    }
  }

  users.forEach(user => {
    if (user.password && !user.password.startsWith('$2a$')) {
      user.password = bcrypt.hashSync(user.password, 10);
      modified = true;
    }
  });
  if (modified) {
    writeUsers(users);
    console.log("Passwords hashed successfully and admin migrated in database.json");
  }
}

// Initialize database
hashPlainPasswords();

// --- CSV Parser Utility (Vietnamese/UTF8 and embedded quotes safe) ---
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

// Helper to normalize string for comparison (remove accents/whitespace/case)
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// Check deadline date helper
// format in exports: YYYY-MM-DD
// format in domestic: DD/MM/YYYY
function parseDeadline(dateStr) {
  if (!dateStr || dateStr.trim() === "" || dateStr.includes("#N/A")) return null;
  dateStr = dateStr.trim();
  let parts;
  if (dateStr.includes('-')) {
    parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  } else if (dateStr.includes('/')) {
    parts = dateStr.split('/');
    if (parts.length === 3) {
      // DD/MM/YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return null;
}

// Calculate days remaining
function getDaysDiff(deadlineDate, refDate) {
  if (!deadlineDate) return null;
  const d1 = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const d2 = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Fetch all sheets and aggregate data
async function fetchAndAggregate() {
  const responses = {};
  const keys = Object.keys(GOOGLE_SHEETS);
  
  for (const key of keys) {
    try {
      const res = await axios.get(`${GOOGLE_SHEETS[key]}&t=${Date.now()}`);
      responses[key] = res.data;
    } catch (err) {
      console.error(`Error fetching sheet ${key}:`, err.message);
      throw new Error(`Failed to fetch ${key}`);
    }
  }

  // Reference Date: Always use the dynamic current date
  const refDate = new Date();

  // 1. Process Employee Sheet
  const employeeLines = parseCSV(responses.employees);
  const employeeList = [];
  const employeeMapping = {}; // maps any normalized name variation/abbreviation to the full name

  // Skip header, process rows
  for (let i = 1; i < employeeLines.length; i++) {
    const row = employeeLines[i];
    if (row.length < 5 || !row[0]) continue;
    const fullName = row[0].trim();
    const isTempAdmin = row[5] ? row[5].trim() : "Thành viên";
    
    employeeList.push({
      fullName,
      viếtTắt: [row[1], row[2], row[3]].filter(v => v).map(v => v.trim()),
      role: isTempAdmin === "Admin" ? "admin" : "user"
    });

    // Populate name mapping
    employeeMapping[normalizeName(fullName)] = fullName;
    [row[1], row[2], row[3]].filter(v => v).forEach(abbr => {
      employeeMapping[normalizeName(abbr.trim())] = fullName;
    });
  }

  // Helper to match names and filter
  function getMatchedEmployees(inChargeStr) {
    if (!inChargeStr) return [];
    // Names might be separated by semicolon or comma
    const parts = inChargeStr.split(/[;,]/).map(p => p.trim()).filter(p => p);
    const matched = [];
    parts.forEach(part => {
      const normalized = normalizeName(part);
      if (employeeMapping[normalized]) {
        matched.push(employeeMapping[normalized]);
      }
    });
    // Return unique matched employees
    return [...new Set(matched)];
  }

  // Initialize export workload (active files)
  const exportWorkload = {};
  employeeList.forEach(e => { exportWorkload[e.fullName] = 0; });
  exportWorkload['Khách -EXP'] = 0;

  // 2. Process HSXK (Export active)
  const hsxkLines = parseCSV(responses.hsxk);
  const hsxkData = [];
  for (let i = 1; i < hsxkLines.length; i++) {
    const row = hsxkLines[i];
    if (row.length < 7 || !row[2]) continue; // needs product name
    const matched = getMatchedEmployees(row[1]);
    
    // Accumulate workload from raw row
    matched.forEach(name => {
      if (exportWorkload[name] !== undefined) exportWorkload[name]++;
    });
    if (row[1] && (row[1].toLowerCase().includes('khách -exp') || row[1].toLowerCase().includes('khach -exp'))) {
      exportWorkload['Khách -EXP']++;
    }

    if (matched.length === 0) continue; // remove unauthorized employees

    const deadline = parseDeadline(row[5]);
    const daysDiff = deadline ? getDaysDiff(deadline, refDate) : null;
    let alarmStatus = null; // 'overdue', '1m', '2m'
    if (daysDiff !== null) {
      if (daysDiff < 0) alarmStatus = 'overdue';
      else if (daysDiff <= 30) alarmStatus = '1m';
      else if (daysDiff <= 60) alarmStatus = '2m';
    }

    hsxkData.push({
      stt: row[0],
      inCharge: matched,
      productName: row[2].trim(),
      exportName: row[3] ? row[3].trim() : "",
      country: row[4] ? row[4].trim() : "",
      deadline: row[5] ? row[5].trim() : "",
      daysDiff,
      alarmStatus,
      classification: row[6] ? row[6].trim() : "",
      note: row[7] ? row[7].trim() : ""
    });
  }

  // 3. Process Nhãn đăng ký (Registration Labels)
  const ndkLines = parseCSV(responses.nhanDangKy);
  const ndkData = [];
  for (let i = 1; i < ndkLines.length; i++) {
    const row = ndkLines[i];
    if (row.length < 7 || !row[2]) continue;
    const matched = getMatchedEmployees(row[1]);
    
    // Accumulate workload from raw row
    matched.forEach(name => {
      if (exportWorkload[name] !== undefined) exportWorkload[name]++;
    });
    if (row[1] && (row[1].toLowerCase().includes('khách -exp') || row[1].toLowerCase().includes('khach -exp'))) {
      exportWorkload['Khách -EXP']++;
    }

    if (matched.length === 0) continue;

    const deadline = parseDeadline(row[5]);
    const daysDiff = deadline ? getDaysDiff(deadline, refDate) : null;
    let alarmStatus = null;
    if (daysDiff !== null) {
      if (daysDiff < 0) alarmStatus = 'overdue';
      else if (daysDiff <= 30) alarmStatus = '1m';
      else if (daysDiff <= 60) alarmStatus = '2m';
    }

    ndkData.push({
      stt: row[0],
      inCharge: matched,
      productName: row[2].trim(),
      exportName: row[3] ? row[3].trim() : "",
      country: row[4] ? row[4].trim() : "",
      deadline: row[5] ? row[5].trim() : "",
      daysDiff,
      alarmStatus,
      classification: row[6] ? row[6].trim() : "",
      note: row[7] ? row[7].trim() : ""
    });
  }

  // 4. Process Nhãn sản xuất (Production Labels)
  const nsxLines = parseCSV(responses.nhanSanXuat);
  const nsxData = [];
  for (let i = 1; i < nsxLines.length; i++) {
    const row = nsxLines[i];
    if (row.length < 7 || !row[2]) continue;
    const matched = getMatchedEmployees(row[1]);
    
    // Accumulate workload from raw row
    matched.forEach(name => {
      if (exportWorkload[name] !== undefined) exportWorkload[name]++;
    });
    if (row[1] && (row[1].toLowerCase().includes('khách -exp') || row[1].toLowerCase().includes('khach -exp'))) {
      exportWorkload['Khách -EXP']++;
    }

    if (matched.length === 0) continue;

    const deadline = parseDeadline(row[5]);
    const daysDiff = deadline ? getDaysDiff(deadline, refDate) : null;
    let alarmStatus = null;
    if (daysDiff !== null) {
      if (daysDiff < 0) alarmStatus = 'overdue';
      else if (daysDiff <= 30) alarmStatus = '1m';
      else if (daysDiff <= 60) alarmStatus = '2m';
    }

    nsxData.push({
      stt: row[0],
      inCharge: matched,
      productName: row[2].trim(),
      exportName: row[3] ? row[3].trim() : "",
      country: row[4] ? row[4].trim() : "",
      deadline: row[5] ? row[5].trim() : "",
      daysDiff,
      alarmStatus,
      classification: row[6] ? row[6].trim() : "",
      note: row[7] ? row[7].trim() : ""
    });
  }

  // 5. Process HSBS trong nước (Domestic Supplement Files)
  const hsbsLines = parseCSV(responses.hsbsTrongNuoc);
  const hsbsData = [];
  for (let i = 1; i < hsbsLines.length; i++) {
    const row = hsbsLines[i];
    if (row.length < 5 || !row[1]) continue; // needs drug name
    const matched = getMatchedEmployees(row[0]);
    if (matched.length === 0) continue;

    const deadline = parseDeadline(row[4]);
    const daysDiff = deadline ? getDaysDiff(deadline, refDate) : null;
    let alarmStatus = null;
    if (daysDiff !== null) {
      if (daysDiff < 0) alarmStatus = 'overdue';
      else if (daysDiff <= 30) alarmStatus = '1m';
      else if (daysDiff <= 60) alarmStatus = '2m';
    }

    hsbsData.push({
      inCharge: matched,
      productName: row[1].trim(),
      status: row[2] ? row[2].trim() : "",
      tnNumber: row[3] ? row[3].trim() : "",
      deadline: row[4] ? row[4].trim() : "",
      daysDiff,
      alarmStatus,
      note: row[5] ? row[5].trim() : ""
    });
  }

  // 6. Process HSGH trong nước (Domestic Extension Files)
  const hsghLines = parseCSV(responses.hsghTrongNuoc);
  const hsghData = [];
  for (let i = 1; i < hsghLines.length; i++) {
    const row = hsghLines[i];
    if (row.length < 4 || !row[1]) continue;
    const matched = getMatchedEmployees(row[0]);
    if (matched.length === 0) continue;

    const deadline = parseDeadline(row[3]);
    const daysDiff = deadline ? getDaysDiff(deadline, refDate) : null;
    let alarmStatus = null;
    if (daysDiff !== null) {
      if (daysDiff < 0) alarmStatus = 'overdue';
      else if (daysDiff <= 30) alarmStatus = '1m';
      else if (daysDiff <= 60) alarmStatus = '2m';
    }

    hsghData.push({
      inCharge: matched,
      productName: row[1].trim(),
      status: row[2] ? row[2].trim() : "",
      deadline: row[3] ? row[3].trim() : "",
      daysDiff,
      alarmStatus,
      note: row[4] ? row[4].trim() : ""
    });
  }

  // 7. Process HSM trong nước (New Domestic Files)
  const hsmLines = parseCSV(responses.hsmTrongNuoc);
  const hsmData = [];
  for (let i = 1; i < hsmLines.length; i++) {
    const row = hsmLines[i];
    if (row.length < 5 || !row[2]) continue;
    const matched = getMatchedEmployees(row[0]);
    if (matched.length === 0) continue;

    hsmData.push({
      inCharge: matched,
      classification: row[1] ? row[1].trim() : "",
      productName: row[2].trim(),
      formulation: row[3] ? row[3].trim() : "",
      ingredients: row[4] ? row[4].trim() : "",
      status: row[5] ? row[5].trim() : ""
    });
  }

  // 8. Process HSTĐ trong nước (Domestic Submission Files)
  const hstdLines = parseCSV(responses.hstdTrongNuoc);
  const hstdData = [];
  for (let i = 1; i < hstdLines.length; i++) {
    const row = hstdLines[i];
    if (row.length < 5 || !row[1]) continue;
    const matched = getMatchedEmployees(row[0]);
    if (matched.length === 0) continue;

    const deadline = row[6] ? parseDeadline(row[6]) : null;
    const daysDiff = deadline ? getDaysDiff(deadline, refDate) : null;
    let alarmStatus = null;
    if (daysDiff !== null) {
      if (daysDiff < 0) alarmStatus = 'overdue';
      else if (daysDiff <= 30) alarmStatus = '1m';
      else if (daysDiff <= 60) alarmStatus = '2m';
    }

    hstdData.push({
      inCharge: matched,
      productName: row[1].trim(),
      classification: row[2] ? row[2].trim() : "",
      content: row[3] ? row[3].trim() : "",
      status: row[4] ? row[4].trim() : "",
      explanation: row[5] ? row[5].trim() : "",
      deadline: row[6] ? row[6].trim() : "",
      daysDiff,
      alarmStatus
    });
  }

  // 9. Process HSXK Cấp (Export cases granted)
  const hsxkCapLines = parseCSV(responses.hsxkCap);
  const hsxkCapData = [];
  for (let i = 1; i < hsxkCapLines.length; i++) {
    const row = hsxkCapLines[i];
    if (row.length < 5) continue;
    const country = row[1] ? row[1].trim() : "";
    const nameExport = row[3] ? row[3].trim() : "";
    const nameDomestic = row[2] ? row[2].trim() : "";
    
    // Skip empty lines
    if (!country && !nameExport && !nameDomestic) continue;
    
    // Map in-charge from Phụ trách and Phụ trách 2
    let matched = [];
    if (row[6]) matched = matched.concat(getMatchedEmployees(row[6]));
    if (row[7]) matched = matched.concat(getMatchedEmployees(row[7]));
    matched = [...new Set(matched)];

    hsxkCapData.push({
      stt: row[0],
      country: country,
      productNameDomestic: nameDomestic,
      productNameExport: nameExport,
      classification: row[4] ? row[4].trim() : "",
      exp: row[5] ? row[5].trim() : "",
      inCharge: matched,
      note: row[8] ? row[8].trim() : ""
    });
  }

  // Group hsxkCapData by country
  const countryCounts = {};
  hsxkCapData.forEach(item => {
    const c = item.country || "Không xác định";
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  const grantedByCountry = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  // Group hsxkCapData by classification
  const classCounts = {};
  hsxkCapData.forEach(item => {
    let cls = item.classification || "Chưa phân loại";
    const norm = cls.toLowerCase();
    if (norm === 'mp') cls = 'Mỹ phẩm';
    else if (norm === 'tpcn') cls = 'Thực phẩm chức năng';
    else if (norm === 'ttb') cls = 'Trang thiết bị';
    else if (norm === 'thuốc' || norm === 'thuoc') cls = 'Thuốc';
    
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  });
  const grantedByClassification = Object.entries(classCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 10. Process Xếp Hạng & Targets
  // Header row has names. We will find which columns match which employee
  const rankLines = parseCSV(responses.xepHang);
  const rankHeader = rankLines[0];
  const rankings = [];
  const goals2026 = [];

  // Map employee name index in rankings
  const employeeColIndices = {};
  for (let col = 2; col < rankHeader.length; col++) {
    const name = rankHeader[col];
    if (!name) continue;
    const normalized = normalizeName(name);
    if (employeeMapping[normalized]) {
      employeeColIndices[employeeMapping[normalized]] = col;
    }
  }

  // Get total scores from Row 10 (STT: "Tổng" is row 19/line 19)
  // Let's search the row that starts with "Tổng" in column 0 or 1
  let totalRow = null;
  for (let i = 1; i < rankLines.length; i++) {
    if (rankLines[i][0] && rankLines[i][0].trim() === "Tổng") {
      totalRow = rankLines[i];
      break;
    }
    if (rankLines[i][1] && rankLines[i][1].trim() === "Tổng") {
      totalRow = rankLines[i];
      break;
    }
  }

  employeeList.forEach(emp => {
    const colIdx = employeeColIndices[emp.fullName];
    let score = 0;
    if (colIdx !== undefined && totalRow) {
      score = parseFloat(totalRow[colIdx]) || 0;
    }
    rankings.push({
      fullName: emp.fullName,
      score: score
    });
  });

  // Sort rankings descending
  rankings.sort((a, b) => b.score - a.score);

  // Parse Targets (rows 10-17)
  // Columns: [15] -> Mục, [16] -> Số lượng được cấp, [17] -> Mục tiêu 2026
  const rawGoals = [];
  for (let i = 1; i < rankLines.length; i++) {
    const row = rankLines[i];
    if (row.length >= 18 && row[15]) {
      const title = row[15].trim();
      const currentVal = row[16] ? row[16].trim() : "";
      const targetVal = row[17] ? row[17].trim() : "";
      if (title && (currentVal || targetVal)) {
        rawGoals.push({ title, currentVal, targetVal });
      }
    }
  }

  // Aggregate and format 2026 goals
  let hsxkCurrentSum = 0;
  rawGoals.forEach(g => {
    const title = g.title.toLowerCase();
    const isLevel1 = title.includes("hs xk mức 1") || title.includes("hsxk mức 1");
    const isLevel2 = title.includes("hs xk mức 2") || title.includes("hsxk mức 2");
    
    // Accumulate the current values for HSXK
    if (isLevel1 || isLevel2) {
      const val = g.currentVal ? parseInt(g.currentVal, 10) || 0 : 0;
      hsxkCurrentSum += val;
    } else {
      const targetNum = parseInt(g.targetVal, 10);
      const hasNumericTarget = !isNaN(targetNum);
      const val = g.currentVal ? parseInt(g.currentVal, 10) || 0 : 0;
      
      goals2026.push({
        goalType: g.title,
        // If it has a numeric target, default empty currentVal to 0, otherwise null
        current: hasNumericTarget ? val : (g.currentVal ? val : null),
        target: g.targetVal
      });
    }
  });

  // Add the combined HS XK goal (Hồ sơ xuất khẩu with target 150)
  goals2026.push({
    goalType: "Hồ sơ xuất khẩu",
    current: hsxkCurrentSum,
    target: "150"
  });

  // Sort goals so that items with output requirements (target is a number/not 'Không yêu cầu') come first
  goals2026.sort((a, b) => {
    const aHasTarget = a.target !== "Không yêu cầu";
    const bHasTarget = b.target !== "Không yêu cầu";
    if (aHasTarget && !bHasTarget) return -1;
    if (!aHasTarget && bHasTarget) return 1;
    return 0;
  });

  // --- Calculations for Dashboards ---

  // Domestic Dashboard Calculations
  // Domestic sheets are: hsbsTrongNuoc, hsghTrongNuoc, hsmTrongNuoc, hstdTrongNuoc
  const domesticKPIs = {
    totalInProgress: hsbsData.length + hsghData.length + hsmData.length + hstdData.length,
    byType: {
      supplement: hsbsData.length,
      extension: hsghData.length,
      newSubmissions: hsmData.length,
      variations: hstdData.length
    },
    overdue: [],
    nearDeadline1m: [],
    nearDeadline2m: []
  };

  // Supplement, Extension & Variations (HSTĐ) have deadlines
  [...hsbsData, ...hsghData, ...hstdData].forEach(record => {
    if (record.alarmStatus === 'overdue') {
      domesticKPIs.overdue.push(record);
    } else if (record.alarmStatus === '1m') {
      domesticKPIs.nearDeadline1m.push(record);
    } else if (record.alarmStatus === '2m') {
      domesticKPIs.nearDeadline2m.push(record);
    }
  });

  // Calculate domestic workload per employee
  const domesticWorkload = {};
  employeeList.forEach(e => { domesticWorkload[e.fullName] = 0; });
  [...hsbsData, ...hsghData, ...hsmData, ...hstdData].forEach(record => {
    record.inCharge.forEach(name => {
      if (domesticWorkload[name] !== undefined) {
        domesticWorkload[name]++;
      }
    });
  });

  // Export Dashboard Calculations
  // Export sheets: hsxk, nhanDangKy, nhanSanXuat
  const exportKPIs = {
    totalInProgress: hsxkData.length + ndkData.length + nsxData.length,
    totalGranted: hsxkCapData.length,
    byType: {
      active: hsxkData.length,
      registrationLabels: ndkData.length,
      productionLabels: nsxData.length
    },
    overdue: [],
    nearDeadline1m: [],
    nearDeadline2m: []
  };

  [...hsxkData, ...ndkData, ...nsxData].forEach(record => {
    if (record.alarmStatus === 'overdue') {
      exportKPIs.overdue.push(record);
    } else if (record.alarmStatus === '1m') {
      exportKPIs.nearDeadline1m.push(record);
    } else if (record.alarmStatus === '2m') {
      exportKPIs.nearDeadline2m.push(record);
    }
  });



  // Calculate export files granted per employee
  const exportGrantedWorkload = {};
  employeeList.forEach(e => { exportGrantedWorkload[e.fullName] = 0; });
  exportGrantedWorkload['Khách -EXP'] = 0;
  hsxkCapData.forEach(record => {
    record.inCharge.forEach(name => {
      if (exportGrantedWorkload[name] !== undefined) {
        exportGrantedWorkload[name]++;
      }
    });
  });

  // Compute final aggregated structure
  return {
    refDate: refDate.toISOString(),
    employees: employeeList,
    rankings,
    goals2026,
    domestic: {
      kpis: {
        totalInProgress: domesticKPIs.totalInProgress,
        byType: domesticKPIs.byType,
        overdueCount: domesticKPIs.overdue.length,
        nearDeadline1mCount: domesticKPIs.nearDeadline1m.length,
        nearDeadline2mCount: domesticKPIs.nearDeadline2m.length,
      },
      overdueList: domesticKPIs.overdue,
      nearDeadline1mList: domesticKPIs.nearDeadline1m,
      nearDeadline2mList: domesticKPIs.nearDeadline2m,
      workload: Object.entries(domesticWorkload).map(([name, count]) => ({ name, count })),
      sheets: {
        hsbs: hsbsData,
        hsgh: hsghData,
        hsm: hsmData,
        hstd: hstdData
      }
    },
    export: {
      kpis: {
        totalInProgress: exportKPIs.totalInProgress,
        totalGranted: exportKPIs.totalGranted,
        byType: exportKPIs.byType,
        overdueCount: exportKPIs.overdue.length,
        nearDeadline1mCount: exportKPIs.nearDeadline1m.length,
        nearDeadline2mCount: exportKPIs.nearDeadline2m.length,
        grantedByCountry,
        grantedByClassification
      },
      overdueList: exportKPIs.overdue,
      nearDeadline1mList: exportKPIs.nearDeadline1m,
      nearDeadline2mList: exportKPIs.nearDeadline2m,
      workload: Object.entries(exportWorkload).map(([name, count]) => ({ name, count })),
      grantedWorkload: Object.entries(exportGrantedWorkload).map(([name, count]) => ({ name, count })),
      sheets: {
        hsxk: hsxkData,
        nhanDangKy: ndkData,
        nhanSanXuat: nsxData,
        hsxkCap: hsxkCapData
      }
    }
  };
}

// Background scheduler for cache updates (every 1 minute)
async function updateCache() {
  try {
    console.log("Fetching Google Sheets data updates...");
    const aggregated = await fetchAndAggregate();
    dataCache.timestamp = new Date();
    dataCache.data = aggregated;
    console.log("Cache updated successfully at:", dataCache.timestamp.toISOString());
  } catch (err) {
    console.error("Cache update failed:", err.message);
  }

  // Fetch custom chatbot sheets
  try {
    if (fs.existsSync(chatbotSheetsDbPath)) {
      const customSheets = JSON.parse(fs.readFileSync(chatbotSheetsDbPath, 'utf8'));
      for (const sheet of customSheets) {
        try {
          const res = await axios.get(`${sheet.url}&t=${Date.now()}`);
          const rows = parseCSV(res.data);
          dataCache.customSheets[sheet.id] = rows;
          console.log(`Successfully fetched custom sheet: ${sheet.title} (${rows.length} rows)`);
        } catch (sheetErr) {
          console.error(`Failed to fetch custom sheet ${sheet.title}:`, sheetErr.message);
        }
      }
    }
  } catch (err) {
    console.error("Custom sheets cache update failed:", err.message);
  }
}

// Seed cache on startup
updateCache();
// Fetch every 1 minute (1 * 60 * 1000)
setInterval(updateCache, 1 * 60 * 1000);

// --- API Endpoints ---

// Get aggregated data (with optional force refresh)
app.get('/api/data', authenticateToken, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const forceRefresh = req.query.refresh === 'true';
  if (forceRefresh || !dataCache.data) {
    try {
      await updateCache();
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch data", details: err.message });
    }
  }

  // Clone cache to avoid modifying the global cache
  const resultData = JSON.parse(JSON.stringify(dataCache.data));
  const user = req.user;

  if (user && user.role !== 'admin') {
    const empName = user.employeeName;

    // Filter domestic sheets
    if (resultData.domestic && resultData.domestic.sheets) {
      const domSheets = resultData.domestic.sheets;
      Object.keys(domSheets).forEach(key => {
        if (Array.isArray(domSheets[key])) {
          domSheets[key] = domSheets[key].filter(item => 
            item.inCharge && item.inCharge.includes(empName)
          );
        }
      });
      // Filter domestic detail lists
      ['overdueList', 'nearDeadline1mList', 'nearDeadline2mList'].forEach(listKey => {
        if (Array.isArray(resultData.domestic[listKey])) {
          resultData.domestic[listKey] = resultData.domestic[listKey].filter(item => 
            item.inCharge && item.inCharge.includes(empName)
          );
        }
      });
    }

    // Filter export sheets
    if (resultData.export && resultData.export.sheets) {
      const expSheets = resultData.export.sheets;
      Object.keys(expSheets).forEach(key => {
        if (Array.isArray(expSheets[key])) {
          expSheets[key] = expSheets[key].filter(item => 
            item.inCharge && item.inCharge.includes(empName)
          );
        }
      });
      // Filter export detail lists
      ['overdueList', 'nearDeadline1mList', 'nearDeadline2mList'].forEach(listKey => {
        if (Array.isArray(resultData.export[listKey])) {
          resultData.export[listKey] = resultData.export[listKey].filter(item => 
            item.inCharge && item.inCharge.includes(empName)
          );
        }
      });
    }
  }

  res.json({
    lastUpdated: dataCache.timestamp,
    ...resultData
  });
});

// Authentication: Login
app.post('/api/auth/login', loginRateLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ số điện thoại và mật khẩu" });
  }

  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác" });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, employeeName: user.employeeName },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      employeeName: user.employeeName,
      username: user.username,
      role: user.role,
      isFirstLogin: user.isFirstLogin
    }
  });
});

// Authentication: Change password
app.post('/api/auth/change-password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "Mật khẩu mới phải từ 4 ký tự trở lên" });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === decoded.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản" });
    }

    const user = users[userIndex];
    // If it's not first login, verify old password
    if (!user.isFirstLogin) {
      if (!oldPassword) {
        return res.status(400).json({ error: "Vui lòng nhập mật khẩu cũ" });
      }
      const match = bcrypt.compareSync(oldPassword, user.password);
      if (!match) {
        return res.status(400).json({ error: "Mật khẩu cũ không chính xác" });
      }
    }

    // Update password
    user.password = bcrypt.hashSync(newPassword, 10);
    user.isFirstLogin = false;
    writeUsers(users);

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(401).json({ error: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" });
  }
});

// Admin Route: Create User account for employee
app.post('/api/auth/create-user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Bạn không có quyền admin" });
    }

    const { employeeName, phone } = req.body;
    if (!employeeName || !phone) {
      return res.status(400).json({ error: "Vui lòng chọn nhân viên và nhập số điện thoại" });
    }

    const users = readUsers();
    const existing = users.find(u => u.username === phone || u.employeeName === employeeName);

    if (existing) {
      return res.status(400).json({ error: "Tài khoản hoặc nhân viên này đã được tạo" });
    }

    const newUser = {
      id: phone,
      employeeName,
      username: phone,
      password: bcrypt.hashSync(phone, 10), // Initial password is phone number
      role: 'user',
      isFirstLogin: true
    };

    users.push(newUser);
    writeUsers(users);

    res.json({ message: `Cấp tài khoản cho ${employeeName} thành công. Tên đăng nhập & mật khẩu mặc định là: ${phone}` });
  } catch (err) {
    res.status(401).json({ error: "Phiên làm việc hết hạn" });
  }
});

// Admin Route: Get list of created accounts
app.get('/api/auth/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Bạn không có quyền admin" });
    }

    const users = readUsers().map(u => ({
      id: u.id,
      employeeName: u.employeeName,
      username: u.username,
      role: u.role,
      isFirstLogin: u.isFirstLogin
    }));

    res.json(users);
  } catch (err) {
    res.status(401).json({ error: "Phiên làm việc hết hạn" });
  }
});

// Admin Route: Delete user account
app.delete('/api/auth/users/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Bạn không có quyền admin" });
    }

    const { id } = req.params;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản" });
    }

    const userToDelete = users[idx];
    if (userToDelete.role === 'admin') {
      return res.status(400).json({ error: "Không thể xóa tài khoản của admin" });
    }

    users.splice(idx, 1);
    writeUsers(users);
    res.json({ message: `Xóa tài khoản của ${userToDelete.employeeName} thành công!` });
  } catch (err) {
    res.status(401).json({ error: "Phiên làm việc hết hạn" });
  }
});

// Chatbot query endpoint
app.post('/api/chatbot/query', authenticateToken, async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });
  }
  try {
    const reply = await queryChatbot(message, history);
    res.json({ reply });
  } catch (err) {
    console.error("Error processing chatbot query:", err);
    res.status(500).json({ error: "Đã xảy ra lỗi khi xử lý tin nhắn của bạn" });
  }
});

// Helper database paths
const legalDocDbPath = path.join(DATA_DIR, 'legal_documents.json');
const legalSyncLogDbPath = path.join(DATA_DIR, 'legal_sync_logs.json');
const chatbotChatsDbPath = path.join(DATA_DIR, 'chatbot_chats.json');
const chatbotSheetsDbPath = path.join(DATA_DIR, 'chatbot_sheets.json');

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Phiên làm việc hết hạn, vui lòng đăng nhập lại" });
  }
}

// Middleware: Require Admin role
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Bạn không có quyền thực hiện chức năng này" });
  }
}

// --- RAG Legal Documents Routes ---

// Get Legal Documents list (Filters: search, source, status, type)
app.get('/api/legal/documents', authenticateToken, (req, res) => {
  try {
    let docs = [];
    if (fs.existsSync(legalDocDbPath)) {
      docs = JSON.parse(fs.readFileSync(legalDocDbPath, 'utf8'));
    }

    const { search, source, status, type } = req.query;

    let filteredDocs = docs;

    if (search) {
      const q = search.toLowerCase();
      filteredDocs = filteredDocs.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.document_number.toLowerCase().includes(q) || 
        d.issuing_authority.toLowerCase().includes(q)
      );
    }
    if (source) {
      filteredDocs = filteredDocs.filter(d => d.source_name === source);
    }
    if (status) {
      filteredDocs = filteredDocs.filter(d => d.status === status);
    }
    if (type) {
      filteredDocs = filteredDocs.filter(d => d.document_type === type);
    }

    res.json(filteredDocs);
  } catch (err) {
    console.error("Error fetching legal documents:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách văn bản" });
  }
});

// Trigger Web Crawler Sync (Admin Only)
app.post('/api/legal/sync', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await executeSync();
    res.json({ message: "Đồng bộ thành công!", result });
  } catch (err) {
    console.error("Crawler sync error:", err);
    res.status(500).json({ error: `Đồng bộ thất bại: ${err.message}` });
  }
});

// Reindex all documents (Admin Only)
app.post('/api/legal/reindex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await indexAllDocuments();
    res.json({ message: "Lập chỉ mục lại thành công!", result });
  } catch (err) {
    console.error("Indexing error:", err);
    res.status(500).json({ error: `Lập chỉ mục thất bại: ${err.message}` });
  }
});

// Toggle document visibility (Admin Only)
app.post('/api/legal/toggle-hide', authenticateToken, requireAdmin, async (req, res) => {
  const { docId, isHidden } = req.body;
  if (!docId) {
    return res.status(400).json({ error: "Thiếu ID văn bản" });
  }
  try {
    let docs = [];
    if (fs.existsSync(legalDocDbPath)) {
      docs = JSON.parse(fs.readFileSync(legalDocDbPath, 'utf8'));
    }
    const idx = docs.findIndex(d => d.id === docId);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy văn bản" });
    }
    docs[idx].isHidden = !!isHidden;
    docs[idx].updated_at = new Date().toISOString();
    fs.writeFileSync(legalDocDbPath, JSON.stringify(docs, null, 2));

    // Update indexes dynamically
    const apiKey = process.env.GEMINI_API_KEY;
    if (!isHidden) {
      await indexDocument(docId, apiKey);
    } else {
      // Remove chunks of hidden doc
      const chunkDbPath = path.join(DATA_DIR, 'legal_chunks.json');
      if (fs.existsSync(chunkDbPath)) {
        let chunks = JSON.parse(fs.readFileSync(chunkDbPath, 'utf8'));
        chunks = chunks.filter(c => c.document_id !== docId);
        fs.writeFileSync(chunkDbPath, JSON.stringify(chunks, null, 2));
      }
    }

    res.json({ message: "Cập nhật trạng thái hiển thị thành công!", document: docs[idx] });
  } catch (err) {
    console.error("Toggle hide error:", err);
    res.status(500).json({ error: `Lỗi hệ thống: ${err.message}` });
  }
});

// Get Sync Logs
app.get('/api/legal/sync-logs', authenticateToken, (req, res) => {
  try {
    let logs = [];
    if (fs.existsSync(legalSyncLogDbPath)) {
      logs = JSON.parse(fs.readFileSync(legalSyncLogDbPath, 'utf8'));
    }
    res.json(logs);
  } catch (err) {
    console.error("Error reading sync logs:", err);
    res.status(500).json({ error: "Không thể lấy nhật ký đồng bộ" });
  }
});


// --- Chatbot Conversations RAG Routes ---

// Get all conversations for current user
app.get('/api/chatbot/conversations', authenticateToken, (req, res) => {
  try {
    let chatDb = { conversations: [], messages: [] };
    if (fs.existsSync(chatbotChatsDbPath)) {
      chatDb = JSON.parse(fs.readFileSync(chatbotChatsDbPath, 'utf8'));
    }
    const userConvs = chatDb.conversations
      .filter(c => c.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(userConvs);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Lỗi lấy danh sách hội thoại" });
  }
});

// Create new conversation
app.post('/api/chatbot/conversations', authenticateToken, (req, res) => {
  const { title } = req.body;
  try {
    let chatDb = { conversations: [], messages: [] };
    if (fs.existsSync(chatbotChatsDbPath)) {
      chatDb = JSON.parse(fs.readFileSync(chatbotChatsDbPath, 'utf8'));
    }
    const newConv = {
      id: 'conv_' + Date.now().toString(),
      user_id: req.user.id,
      title: title || 'Hội thoại mới',
      created_at: new Date().toISOString()
    };
    chatDb.conversations.push(newConv);
    fs.writeFileSync(chatbotChatsDbPath, JSON.stringify(chatDb, null, 2));
    res.json(newConv);
  } catch (err) {
    console.error("Error creating conversation:", err);
    res.status(500).json({ error: "Lỗi tạo hội thoại mới" });
  }
});

// Delete conversation
app.delete('/api/chatbot/conversations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    let chatDb = { conversations: [], messages: [] };
    if (fs.existsSync(chatbotChatsDbPath)) {
      chatDb = JSON.parse(fs.readFileSync(chatbotChatsDbPath, 'utf8'));
    }
    
    // Check ownership
    const convIdx = chatDb.conversations.findIndex(c => c.id === id && c.user_id === req.user.id);
    if (convIdx === -1) {
      return res.status(404).json({ error: "Không tìm thấy hội thoại" });
    }

    chatDb.conversations.splice(convIdx, 1);
    chatDb.messages = chatDb.messages.filter(m => m.conversation_id !== id);
    
    fs.writeFileSync(chatbotChatsDbPath, JSON.stringify(chatDb, null, 2));
    res.json({ message: "Đã xóa cuộc hội thoại thành công" });
  } catch (err) {
    console.error("Error deleting conversation:", err);
    res.status(500).json({ error: "Lỗi xóa hội thoại" });
  }
});

// Get messages for a conversation
app.get('/api/chatbot/messages/:conversationId', authenticateToken, (req, res) => {
  const { conversationId } = req.params;
  try {
    let chatDb = { conversations: [], messages: [] };
    if (fs.existsSync(chatbotChatsDbPath)) {
      chatDb = JSON.parse(fs.readFileSync(chatbotChatsDbPath, 'utf8'));
    }
    
    // Verify conversation ownership
    const exists = chatDb.conversations.some(c => c.id === conversationId && c.user_id === req.user.id);
    if (!exists) {
      return res.status(403).json({ error: "Không có quyền truy cập hội thoại này" });
    }

    const messages = chatDb.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Lỗi lấy nội dung hội thoại" });
  }
});

// --- Admin Chatbot Sheets Management ---

// Get all configured custom sheets (Admin only)
app.get('/api/admin/chatbot-sheets', authenticateToken, requireAdmin, (req, res) => {
  try {
    let sheets = [];
    if (fs.existsSync(chatbotSheetsDbPath)) {
      sheets = JSON.parse(fs.readFileSync(chatbotSheetsDbPath, 'utf8'));
    }
    res.json(sheets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a custom sheet (Admin only)
app.post('/api/admin/chatbot-sheets', authenticateToken, requireAdmin, async (req, res) => {
  const { title, url, security, filterColumn } = req.body;
  if (!title || !url || !security) {
    return res.status(400).json({ error: "Thiếu thông tin cấu hình nguồn dữ liệu" });
  }

  try {
    let sheets = [];
    if (fs.existsSync(chatbotSheetsDbPath)) {
      sheets = JSON.parse(fs.readFileSync(chatbotSheetsDbPath, 'utf8'));
    }

    const newSheet = {
      id: 'sheet_' + Date.now().toString(),
      title,
      url,
      security,
      filterColumn: security === 'role-filtered' ? filterColumn : ''
    };

    sheets.push(newSheet);
    fs.writeFileSync(chatbotSheetsDbPath, JSON.stringify(sheets, null, 2));

    // Fetch and cache immediately
    try {
      console.log(`Fetching and caching new custom sheet immediately: ${title}`);
      const resData = await axios.get(`${url}&t=${Date.now()}`);
      const rows = parseCSV(resData.data);
      dataCache.customSheets[newSheet.id] = rows;
    } catch (fetchErr) {
      console.error(`Failed to cache new sheet immediately:`, fetchErr.message);
    }

    res.json({ message: "Thêm nguồn dữ liệu thành công!", sheet: newSheet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a custom sheet (Admin only)
app.delete('/api/admin/chatbot-sheets/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    let sheets = [];
    if (fs.existsSync(chatbotSheetsDbPath)) {
      sheets = JSON.parse(fs.readFileSync(chatbotSheetsDbPath, 'utf8'));
    }

    const idx = sheets.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy nguồn dữ liệu" });
    }

    const deletedTitle = sheets[idx].title;
    sheets.splice(idx, 1);
    fs.writeFileSync(chatbotSheetsDbPath, JSON.stringify(sheets, null, 2));

    // Remove from in-memory cache
    delete dataCache.customSheets[id];

    res.json({ message: `Đã xóa nguồn dữ liệu: ${deletedTitle}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications API: GET user notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifs = readNotifications();
    const userNotifs = notifs.filter(n => n.username === req.user.username);
    res.json(userNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống khi lấy thông báo." });
  }
});

// Notifications API: Mark notification(s) as read
app.post('/api/notifications/read', authenticateToken, (req, res) => {
  const { id } = req.body;
  try {
    const notifs = readNotifications();
    notifs.forEach(n => {
      if (n.username === req.user.username && (id ? n.id === id : true)) {
        n.isRead = true;
      }
    });
    writeNotifications(notifs);
    res.json({ message: "Đã đánh dấu đã đọc thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống khi cập nhật thông báo." });
  }
});

// Viber API: GET Viber configuration (Admin only)
app.get('/api/viber-config', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json(readViberConfig());
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy cấu hình Viber." });
  }
});

// Viber API: POST Viber configuration (Admin only)
app.post('/api/viber-config', authenticateToken, requireAdmin, (req, res) => {
  const { viberBotToken, mappings } = req.body;
  try {
    const config = { viberBotToken: viberBotToken || "", mappings: mappings || [] };
    writeViberConfig(config);
    res.json({ message: "Lưu cấu hình Viber thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lưu cấu hình Viber." });
  }
});


// Helper: serialize dossier data to plain text format for AI prompt
function serializeDossierDataForAI(resultData) {
  let context = "";

  if (resultData.domestic) {
    context += "=== HỒ SƠ TRONG NƯỚC ===\n";
    const sheets = resultData.domestic.sheets || {};
    
    if (sheets.hsbs && sheets.hsbs.length > 0) {
      context += "\nDanh sách hồ sơ bổ sung (HSBS):\n";
      sheets.hsbs.forEach((item, idx) => {
        context += `${idx + 1}. Thuốc: ${item.productName || '—'} | Tình trạng: ${item.status || '—'} | Số TN: ${item.tnNumber || '—'} | Hạn ngày BS: ${item.deadline || '—'} | Cảnh báo: ${item.daysDiff !== null ? (item.daysDiff < 0 ? `Quá hạn ${Math.abs(item.daysDiff)} ngày` : `Còn ${item.daysDiff} ngày`) : '—'} | Ghi chú: ${item.note || '—'}\n`;
      });
    }

    if (sheets.hsgh && sheets.hsgh.length > 0) {
      context += "\nDanh sách hồ sơ gia hạn (HSGH):\n";
      sheets.hsgh.forEach((item, idx) => {
        context += `${idx + 1}. Thuốc: ${item.productName || '—'} | Tình trạng: ${item.status || '—'} | Hạn ngày gia hạn: ${item.deadline || '—'} | Cảnh báo: ${item.daysDiff !== null ? (item.daysDiff < 0 ? `Quá hạn ${Math.abs(item.daysDiff)} ngày` : `Còn ${item.daysDiff} ngày`) : '—'} | Ghi chú: ${item.note || '—'}\n`;
      });
    }

    if (sheets.hsm && sheets.hsm.length > 0) {
      context += "\nDanh sách hồ sơ mới (HSM):\n";
      sheets.hsm.forEach((item, idx) => {
        context += `${idx + 1}. Phân loại: ${item.classification || '—'} | Tên Thuốc: ${item.productName || '—'} | Dạng bào chế: ${item.formulation || '—'} | Hoạt chất: ${item.ingredients || '—'} | Tình trạng: ${item.status || '—'}\n`;
      });
    }

    if (sheets.hstd && sheets.hstd.length > 0) {
      context += "\nDanh sách hồ sơ thay đổi (HSTĐ):\n";
      sheets.hstd.forEach((item, idx) => {
        context += `${idx + 1}. Thuốc: ${item.productName || '—'} | Phân loại: ${item.classification || '—'} | Nội dung thay đổi: ${item.content || '—'} | Tình trạng: ${item.status || '—'} | Giải trình: ${item.explanation || '—'}\n`;
      });
    }
  }

  if (resultData.export) {
    context += "\n=== HỒ SƠ XUẤT KHẨU ===\n";
    const sheets = resultData.export.sheets || {};

    if (sheets.hsxk && sheets.hsxk.length > 0) {
      context += "\nDanh sách hồ sơ xuất khẩu đang làm (HSXK):\n";
      sheets.hsxk.forEach((item, idx) => {
        context += `${idx + 1}. Sản phẩm: ${item.productName || '—'} | Tên XK: ${item.exportName || '—'} | Quốc gia: ${item.country || '—'} | Hạn nộp: ${item.deadline || '—'} | Cảnh báo: ${item.daysDiff !== null ? (item.daysDiff < 0 ? `Quá hạn ${Math.abs(item.daysDiff)} ngày` : `Còn ${item.daysDiff} ngày`) : '—'} | Phân loại: ${item.classification || '—'} | Phụ trách: ${item.inCharge?.join(', ') || '—'} | Ghi chú: ${item.note || '—'}\n`;
      });
    }

    if (sheets.nhanDangKy && sheets.nhanDangKy.length > 0) {
      context += "\nDanh sách nhãn đăng ký (NDK):\n";
      sheets.nhanDangKy.forEach((item, idx) => {
        context += `${idx + 1}. Sản phẩm: ${item.productName || '—'} | Tên XK: ${item.exportName || '—'} | Quốc gia: ${item.country || '—'} | Hạn nộp: ${item.deadline || '—'} | Cảnh báo: ${item.daysDiff !== null ? (item.daysDiff < 0 ? `Quá hạn ${Math.abs(item.daysDiff)} ngày` : `Còn ${item.daysDiff} ngày`) : '—'} | Phân loại: ${item.classification || '—'} | Phụ trách: ${item.inCharge?.join(', ') || '—'} | Ghi chú: ${item.note || '—'}\n`;
      });
    }

    if (sheets.nhanSanXuat && sheets.nhanSanXuat.length > 0) {
      context += "\nDanh sách nhãn sản xuất (NSX):\n";
      sheets.nhanSanXuat.forEach((item, idx) => {
        context += `${idx + 1}. Sản phẩm: ${item.productName || '—'} | Tên XK: ${item.exportName || '—'} | Quốc gia: ${item.country || '—'} | Hạn nộp: ${item.deadline || '—'} | Cảnh báo: ${item.daysDiff !== null ? (item.daysDiff < 0 ? `Quá hạn ${Math.abs(item.daysDiff)} ngày` : `Còn ${item.daysDiff} ngày`) : '—'} | Phân loại: ${item.classification || '—'} | Phụ trách: ${item.inCharge?.join(', ') || '—'} | Ghi chú: ${item.note || '—'}\n`;
      });
    }
  }
  
  return context;
}

// Auto-adaptive Gemini model picker
let selectedGeminiModel = null;

async function getAvailableGeminiModel(genAI) {
  if (selectedGeminiModel) return selectedGeminiModel;
  
  try {
    const list = await genAI.listModels();
    // Find first flash or pro model that supports generateContent
    const candidates = list.models.filter(m => 
      m.supportedMethods && 
      m.supportedMethods.includes('generateContent') && 
      (m.name.includes('gemini-2.5-flash') || m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-2.0-flash'))
    );
    
    if (candidates.length > 0) {
      // Sort candidates to prioritize newer flash models for speed (2.5-flash -> 2.0-flash -> 1.5-flash)
      candidates.sort((a, b) => {
        const getScore = (name) => {
          if (name.includes('gemini-2.5-flash')) return 3;
          if (name.includes('gemini-2.0-flash')) return 2;
          if (name.includes('gemini-1.5-flash')) return 1;
          return 0;
        };
        return getScore(b.name) - getScore(a.name);
      });
      selectedGeminiModel = candidates[0].name.replace('models/', '');
      console.log(`Auto-selected Gemini model: ${selectedGeminiModel}`);
      return selectedGeminiModel;
    }

    const anyGen = list.models.find(m => m.supportedMethods && m.supportedMethods.includes('generateContent'));
    if (anyGen) {
      selectedGeminiModel = anyGen.name.replace('models/', '');
      console.log(`Auto-selected Gemini model (fallback): ${selectedGeminiModel}`);
      return selectedGeminiModel;
    }
  } catch (err) {
    console.error("Failed to list models, using default gemini-2.5-flash:", err.message);
  }

  selectedGeminiModel = "gemini-2.5-flash";
  return selectedGeminiModel;
}

// Execute Dossier Chatbot Query (Real-time Google Sheet Data with security filtering)
app.post('/api/chatbot/query-dossier', authenticateToken, async (req, res) => {
  const { conversationId, message } = req.body;
  if (!conversationId || !message) {
    return res.status(400).json({ error: "Thiếu thông tin hội thoại hoặc câu hỏi" });
  }

  try {
    let chatDb = { conversations: [], messages: [] };
    if (fs.existsSync(chatbotChatsDbPath)) {
      chatDb = JSON.parse(fs.readFileSync(chatbotChatsDbPath, 'utf8'));
    }
    
    // Verify ownership
    const conv = chatDb.conversations.find(c => c.id === conversationId && c.user_id === req.user.id);
    if (!conv) {
      return res.status(403).json({ error: "Không có quyền truy cập hội thoại này" });
    }

    // Fetch real-time cached Google Sheets data
    if (!dataCache.data) {
      try {
        await updateCache();
      } catch (err) {
        return res.status(500).json({ error: "Failed to load sheets data for chatbot context." });
      }
    }

    const resultData = JSON.parse(JSON.stringify(dataCache.data));
    const user = req.user;

    // Filter main sheets
    if (user && user.role !== 'admin') {
      const empName = user.employeeName;

      // Filter domestic sheets
      if (resultData.domestic && resultData.domestic.sheets) {
        const domSheets = resultData.domestic.sheets;
        Object.keys(domSheets).forEach(key => {
          if (Array.isArray(domSheets[key])) {
            domSheets[key] = domSheets[key].filter(item => 
              item.inCharge && item.inCharge.includes(empName)
            );
          }
        });
      }

      // Filter export sheets
      if (resultData.export && resultData.export.sheets) {
        const expSheets = resultData.export.sheets;
        Object.keys(expSheets).forEach(key => {
          if (Array.isArray(expSheets[key])) {
            expSheets[key] = expSheets[key].filter(item => 
              item.inCharge && item.inCharge.includes(empName)
            );
          }
        });
      }
    }

    // Serialize filtered main sheets
    const dossierContext = serializeDossierDataForAI(resultData);

    // Serialize custom sheets with security filters
    let customSheetsContext = "";
    if (fs.existsSync(chatbotSheetsDbPath)) {
      const sheetsList = JSON.parse(fs.readFileSync(chatbotSheetsDbPath, 'utf8'));
      for (const sh of sheetsList) {
        const cachedRows = dataCache.customSheets[sh.id];
        if (!cachedRows || cachedRows.length === 0) continue;

        if (sh.security === 'private' && user.role !== 'admin') {
          continue; 
        }

        let finalRows = cachedRows;

        if (sh.security === 'role-filtered' && user.role !== 'admin') {
          const header = cachedRows[0];
          const colIndex = header.findIndex(cell => 
            cell.toLowerCase().trim() === sh.filterColumn.toLowerCase().trim()
          );

          if (colIndex !== -1) {
            const bodyRows = cachedRows.slice(1).filter(row => {
              const cellVal = row[colIndex] || "";
              return cellVal.toLowerCase().includes(user.employeeName.toLowerCase());
            });
            finalRows = [header, ...bodyRows];
          }
        }

        if (finalRows.length > 1) {
          customSheetsContext += `\nDANH MỤC PHỤ TRỢ: ${sh.title.toUpperCase()}\n`;
          finalRows.forEach((row, rowIdx) => {
            if (rowIdx === 0) {
              customSheetsContext += `Cột: [${row.join(' | ')}]\n`;
            } else {
              customSheetsContext += `- Dòng ${rowIdx}: [${row.join(' | ')}]\n`;
            }
          });
        }
      }
    }

    // Save user message to database
    const userMsg = {
      id: 'msg_' + Date.now().toString(),
      conversation_id: conversationId,
      sender: 'user',
      text: message,
      created_at: new Date().toISOString()
    };

    // Gather history and clean it to alternate strictly: user, model, user, model
    const prevMessages = chatDb.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-6); 

    const cleanedHistory = [];
    let expectedRole = 'user';
    prevMessages.forEach(m => {
      const currentRole = m.sender === 'user' ? 'user' : 'model';
      if (currentRole === expectedRole) {
        cleanedHistory.push({
          role: currentRole,
          parts: [{ text: m.text }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    });

    // Make sure history ends with 'model' so the next message can be 'user'
    if (cleanedHistory.length > 0 && cleanedHistory[cleanedHistory.length - 1].role === 'user') {
      cleanedHistory.pop();
    }

    // Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    let replyText = "";

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const systemInstruction = `Bạn là Trợ lý Quản lý Hồ sơ AI của phòng Đăng ký thuốc (Regulatory Affairs) thuộc công ty CPC1HN.

Nhiệm vụ của bạn bao gồm:
1. Nắm bắt và thống kê chính xác số lượng hồ sơ đang phụ trách của mỗi người, tình trạng hồ sơ quá hạn, sắp đến hạn dựa trên dữ liệu Google Sheets thời gian thực được cung cấp dưới đây.
2. Trả lời các câu hỏi và hỗ trợ nhân sự lên kế hoạch làm việc khoa học của ngày / tuần / tháng dựa trên các thời hạn nộp hồ sơ (deadlines).
3. Hỗ trợ người quản lý phân bổ và giao hồ sơ mới một cách hợp lý và công bằng.

DỮ LIỆU HỒ SƠ ĐĂNG KÝ (ĐÃ ĐƯỢC PHÂN QUYỀN AN TOÀN):
${dossierContext}

DỮ LIỆU QUY TRÌNH PHỤ TRỢ (ĐÃ ĐƯỢC PHÂN QUYỀN AN TOÀN):
${customSheetsContext || "Hiện không có tài liệu phụ trợ nào bổ sung."}

THÔNG TIN NGƯỜI DÙNG:
- Người dùng đang trò chuyện: ${user.employeeName}
- Vai trò: ${user.role}

HƯỚNG DẪN TRẢ LỜI NGHIÊM NGẶT (RẤT QUAN TRỌNG):
1. Bạn chỉ được trả lời dựa hoàn toàn trên Dữ liệu hồ sơ và Dữ liệu quy trình phụ trợ được cung cấp ở trên. Bạn tuyệt đối KHÔNG ĐƯỢC tự bịa đặt, suy đoán hoặc tự vẽ ra bất kỳ thông tin nào không xuất hiện trong dữ liệu được cung cấp.
2. Nếu câu hỏi của người dùng yêu cầu thông tin về sản phẩm, trạng thái hoặc bất kỳ dữ liệu nào KHÔNG TỒN TẠI hoặc KHÔNG TÌM THẤY trong ngữ cảnh dữ liệu được cung cấp ở trên, bạn BẮT BUỘC phải trả lời nguyên văn câu sau và KHÔNG ĐƯỢC giải thích gì thêm:
"Hiện tại hệ thống không có thông tin về nội dung này."
3. Trả lời một cách rõ ràng, ngắn gọn, chuyên nghiệp bằng tiếng Việt. Định dạng câu trả lời đẹp mắt bằng Markdown.
4. QUY TẮC PHÂN BỔ HỒ SƠ MỚI CHO HỢP LÝ: Khi người dùng hỏi cần phân thêm hồ sơ mới cho ai (hoặc ai nên nhận thêm việc), bạn bắt buộc phải kiểm tra dữ liệu và đề xuất người đang phụ trách ÍT HỒ SƠ ĐANG LÀM NHẤT (tổng số hồ sơ đang phụ trách là ít nhất). Tuyệt đối KHÔNG gợi ý phân việc cho người đang có nhiều hồ sơ quá hạn hoặc sắp đến hạn nhất. Giải thích rõ lý do gợi ý (ví dụ: Số lượng hồ sơ hiện tại đang phụ trách, số lượng hồ sơ quá hạn).
5. HƯỚNG DẪN LÊN KẾ HOẠCH LÀM VIỆC (NGÀY/TUẦN/THÁNG): Khi người dùng yêu cầu lập kế hoạch làm việc (cho bản thân họ hoặc cho cả phòng), hãy lọc ra các hồ sơ có thời hạn (deadlines) và cảnh báo quá hạn (daysDiff). Sắp xếp theo thứ tự ưu tiên: Hồ sơ đã quá hạn (cần giải quyết ngay trong ngày/tuần) -> Hồ sơ hạn dưới 1 tháng (cần làm trong tuần/tháng) -> Hồ sơ hạn 1 - 2 tháng. Trình bày kế hoạch một cách khoa học, rõ ràng.`;

        const modelName = await getAvailableGeminiModel(genAI);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemInstruction
        });

        const chat = model.startChat({
          history: cleanedHistory
        });

        const result = await chat.sendMessage(message);
        replyText = result.response.text();
      } catch (err) {
        console.error("Gemini API Dossier Query Error:", err);
        replyText = `Không thể kết nối dịch vụ AI (${err.message}). Vui lòng thử lại sau giây lát.`;
      }
    } else {
      replyText = "Hệ thống AI chưa được cấu hình khóa API (GEMINI_API_KEY). Vui lòng cấu hình biến môi trường này để kích hoạt Chatbot.";
    }

    const botMsg = {
      id: 'msg_' + (Date.now() + 1).toString(),
      conversation_id: conversationId,
      sender: 'bot',
      text: replyText,
      created_at: new Date().toISOString()
    };

    chatDb.messages.push(userMsg, botMsg);
    fs.writeFileSync(chatbotChatsDbPath, JSON.stringify(chatDb, null, 2));

    console.log(`[Dossier AI Audit Log] User: ${user.employeeName} (${user.role}) | Msg: "${message}" | Bot: "${replyText.substring(0, 100)}..."`);
    res.json(botMsg);
  } catch (err) {
    console.error("Error executing dossier query:", err);
    res.status(500).json({ error: "Đã xảy ra lỗi khi xử lý câu hỏi của bạn" });
  }
});

// Execute RAG Chatbot Query
app.post('/api/chatbot/query-rag', authenticateToken, async (req, res) => {
  const { conversationId, message } = req.body;
  if (!conversationId || !message) {
    return res.status(400).json({ error: "Thiếu thông tin hội thoại hoặc câu hỏi" });
  }

  try {
    let chatDb = { conversations: [], messages: [] };
    if (fs.existsSync(chatbotChatsDbPath)) {
      chatDb = JSON.parse(fs.readFileSync(chatbotChatsDbPath, 'utf8'));
    }
    
    // Verify ownership
    const conv = chatDb.conversations.find(c => c.id === conversationId && c.user_id === req.user.id);
    if (!conv) {
      return res.status(403).json({ error: "Không có quyền truy cập hội thoại này" });
    }

    // 1. Vector Search for top chunks
    const chunks = await retrieveRelevantChunks(message, 4);

    // 2. Handle empty RAG database or zero matches
    if (chunks.length === 0) {
      const emptyText = "Chưa tìm thấy căn cứ phù hợp trong kho văn bản.";
      const userMsg = {
        id: 'msg_' + Date.now().toString(),
        conversation_id: conversationId,
        sender: 'user',
        text: message,
        created_at: new Date().toISOString()
      };
      const botMsg = {
        id: 'msg_' + (Date.now() + 1).toString(),
        conversation_id: conversationId,
        sender: 'bot',
        text: emptyText,
        sources: [],
        hasWarning: false,
        created_at: new Date().toISOString()
      };
      chatDb.messages.push(userMsg, botMsg);
      fs.writeFileSync(chatbotChatsDbPath, JSON.stringify(chatDb, null, 2));

      // Audit log print (Security requirement)
      console.log(`[RAG Audit Log] User: ${req.user.employeeName} | Msg: "${message}" | Bot: "${emptyText}"`);
      return res.json(botMsg);
    }

    // 3. Check for documents with "chưa xác định" validity status to issue warnings
    const hasWarning = chunks.some(c => c.status === "chưa xác định");

    // 4. Build prompt context from chunks
    const chunksContext = chunks.map((c, i) => 
      `[Văn bản ${i + 1}]: ${c.document_title}\n` +
      `- Số hiệu: ${c.document_number}\n` +
      `- Cơ quan ban hành: ${c.issuing_authority}\n` +
      `- Trạng thái hiệu lực: ${c.status}\n` +
      `- Link văn bản gốc: ${c.source_url}\n` +
      `- Nội dung trích dẫn: ${c.content}`
    ).join('\n\n');

    // 5. Gather conversation history
    const prevMessages = chatDb.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-6); // last 6 turns

    const formattedHistory = prevMessages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // 6. Call Gemini if API Key is available
    const apiKey = process.env.GEMINI_API_KEY;
    let replyText = "";

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const systemInstruction = `Bạn là chuyên gia tư vấn pháp luật đăng ký dược phẩm, mỹ phẩm, trang thiết bị y tế và thực phẩm chức năng tại Việt Nam cho công ty CPC1HN.

Dưới đây là ngữ cảnh trích lục từ kho văn bản pháp luật hiện có:
${chunksContext}

Hãy trả lời câu hỏi của người dùng dựa hoàn toàn vào ngữ cảnh này.
Yêu cầu bắt buộc về định dạng câu trả lời bằng tiếng Việt:
1. Bạn phải chia cấu trúc câu trả lời thành 4 phần rõ ràng với các tiêu đề in đậm sau:
   - **Kết luận:** Tóm tắt câu trả lời ngắn gọn trong 1 hoặc 2 câu.
   - **Phân tích áp dụng:** Phân tích chi tiết quy định dựa trên các đoạn trích dẫn.
   - **Căn cứ pháp lý:** Liệt kê rõ số hiệu văn bản pháp luật hỗ trợ câu trả lời (ví dụ: Nghị định 163/2025/NĐ-CP, Thông tư 12/2025/TT-BYT).
   - **Cảnh báo:** (Nếu ngữ cảnh chứa văn bản có tình trạng hiệu lực 'chưa xác định', bạn bắt buộc phải ghi rõ cảnh báo: "Lưu ý: Văn bản [Tên văn bản] hiện đang ở tình trạng chưa xác định hiệu lực pháp lý hoặc chưa chính thức có hiệu lực, vui lòng kiểm chứng kỹ trước khi áp dụng thực tế"). Nếu không có văn bản chưa xác định nào, bỏ qua phần này hoặc ghi "Không có".
2. Nếu trong ngữ cảnh trên KHÔNG chứa bất kỳ thông tin nào liên quan đến câu hỏi hoặc không thể tìm thấy căn cứ phù hợp để trả lời, bạn bắt buộc phải trả lời nguyên văn câu sau: "Chưa tìm thấy căn cứ phù hợp trong kho văn bản." Không thêm bớt bất kỳ từ nào khác.`;

        const modelName = await getAvailableGeminiModel(genAI);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemInstruction
        });

        const chat = model.startChat({
          history: formattedHistory
        });

        const result = await chat.sendMessage(message);
        replyText = result.response.text();
      } catch (err) {
        console.error("Gemini API RAG Query Error, falling back to offline template:", err);
      }
    }

    // 7. Fallback formatting if offline or Gemini API error
    if (!replyText) {
      replyText = `**Kết luận:** Dựa trên tài liệu tìm thấy trong kho văn bản, chúng tôi xin cung cấp thông tin liên quan đến câu hỏi của bạn.\n\n` +
        `**Phân tích áp dụng:**\n`;
      
      chunks.forEach((chunk, i) => {
        replyText += `* [Trích dẫn ${i + 1}] (${chunk.document_title}): ${chunk.content}\n`;
      });
      
      replyText += `\n**Căn cứ pháp lý:**\n`;
      const uniqueDocs = [...new Set(chunks.map(c => `${c.document_title} (Số hiệu: ${c.document_number})`))];
      uniqueDocs.forEach(d => {
        replyText += `- ${d}\n`;
      });
      
      replyText += `\n**Cảnh báo:**\n`;
      if (hasWarning) {
        const warnedDocs = [...new Set(chunks.filter(c => c.status === "chưa xác định").map(c => c.document_title))];
        replyText += `Lưu ý: Văn bản sau đang ở trạng thái chưa xác định hiệu lực pháp lý hoặc chưa chính thức có hiệu lực: ${warnedDocs.join(', ')}. Vui lòng xác thực kỹ tình trạng pháp lý trước khi thực hiện.`;
      } else {
        replyText += `Không có.`;
      }
    }

    // 8. Extract unique source references
    const sources = chunks.map(c => ({
      title: c.document_title,
      document_number: c.document_number,
      issuing_authority: c.issuing_authority,
      source_name: c.source_name,
      source_url: c.source_url,
      contentSnippet: c.content
    }));

    const uniqueSources = [];
    const seenNumbers = new Set();
    sources.forEach(s => {
      if (!seenNumbers.has(s.document_number)) {
        seenNumbers.add(s.document_number);
        uniqueSources.push(s);
      }
    });

    // 9. Save message conversation
    const userMsg = {
      id: 'msg_' + Date.now().toString(),
      conversation_id: conversationId,
      sender: 'user',
      text: message,
      created_at: new Date().toISOString()
    };
    const botMsg = {
      id: 'msg_' + (Date.now() + 1).toString(),
      conversation_id: conversationId,
      sender: 'bot',
      text: replyText,
      sources: uniqueSources,
      hasWarning: hasWarning,
      created_at: new Date().toISOString()
    };

    chatDb.messages.push(userMsg, botMsg);
    
    // Update conversation title if it was default
    const convIdx = chatDb.conversations.findIndex(c => c.id === conversationId);
    if (convIdx !== -1 && chatDb.conversations[convIdx].title === 'Hội thoại mới') {
      // Set title as first 30 chars of query
      chatDb.conversations[convIdx].title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    fs.writeFileSync(chatbotChatsDbPath, JSON.stringify(chatDb, null, 2));

    // Audit log print (Security requirement)
    console.log(`[RAG Audit Log] User: ${req.user.employeeName} | Msg: "${message}" | Bot: "${replyText.substring(0, 50)}..."`);
    
    res.json(botMsg);
  } catch (err) {
    console.error("Error processing RAG chatbot query:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi xử lý câu hỏi của bạn" });
  }
});

// Initial indexing check on startup
const chunkDbPath = path.join(DATA_DIR, 'legal_chunks.json');
try {
  if (fs.existsSync(chunkDbPath)) {
    const chunksData = JSON.parse(fs.readFileSync(chunkDbPath, 'utf8'));
    if (chunksData.length === 0) {
      console.log("No chunks found in database. Performing initial indexing...");
      indexAllDocuments()
        .then(r => console.log(`Initial indexing completed. Created ${r.chunkCount} vector chunks.`))
        .catch(e => console.error("Initial indexing failed on startup:", e));
    }
  }
} catch (e) {
  console.error("Failed to run startup indexing check:", e);
}

// --- Monthly KPI Database Helpers & Endpoints ---
const kpiRecordsDbPath = path.join(DATA_DIR, 'kpi_records.json');

function readKpis() {
  try {
    if (!fs.existsSync(kpiRecordsDbPath)) {
      fs.writeFileSync(kpiRecordsDbPath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(kpiRecordsDbPath, 'utf8'));
  } catch (err) {
    console.error("Error reading KPI records:", err);
    return [];
  }
}

function writeKpis(kpis) {
  try {
    fs.writeFileSync(kpiRecordsDbPath, JSON.stringify(kpis, null, 2));
  } catch (err) {
    console.error("Error writing KPI records:", err);
  }
}

// Notifications and Viber config helpers
const notificationsDbPath = path.join(DATA_DIR, 'notifications.json');
function readNotifications() {
  try {
    if (!fs.existsSync(notificationsDbPath)) {
      fs.writeFileSync(notificationsDbPath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(notificationsDbPath, 'utf8'));
  } catch (err) {
    console.error("Error reading notifications:", err);
    return [];
  }
}
function writeNotifications(notifs) {
  try {
    fs.writeFileSync(notificationsDbPath, JSON.stringify(notifs, null, 2));
  } catch (err) {
    console.error("Error writing notifications:", err);
  }
}

function addNotification(username, employeeName, message, type) {
  const notifs = readNotifications();
  const newNotif = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    username,
    employeeName,
    message,
    type, // 'success', 'error', 'info'
    isRead: false,
    createdAt: new Date().toISOString()
  };
  notifs.push(newNotif);
  writeNotifications(notifs);

  // Send Viber message asynchronously
  sendViberNotification(employeeName, message).catch(err => {
    console.error("Async Viber send failed:", err);
  });
}

const viberConfigPath = path.join(DATA_DIR, 'viber_config.json');
function readViberConfig() {
  try {
    if (!fs.existsSync(viberConfigPath)) {
      fs.writeFileSync(viberConfigPath, JSON.stringify({ viberBotToken: "", mappings: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(viberConfigPath, 'utf8'));
  } catch (err) {
    console.error("Error reading Viber config:", err);
    return { viberBotToken: "", mappings: [] };
  }
}
function writeViberConfig(config) {
  try {
    fs.writeFileSync(viberConfigPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error writing Viber config:", err);
  }
}

async function sendViberNotification(employeeName, message) {
  const config = readViberConfig();
  const token = process.env.VIBER_BOT_TOKEN || config.viberBotToken;
  if (!token) {
    console.log(`[Viber Notify Bypass] No Viber Bot Token configured. Cannot notify ${employeeName}.`);
    return;
  }
  
  const userMap = config.mappings.find(m => m.employeeName === employeeName);
  if (!userMap || !userMap.viberId) {
    console.log(`[Viber Notify Bypass] No Viber ID mapped for employee: ${employeeName}.`);
    return;
  }
  
  try {
    const viberUrl = 'https://chatapi.viber.com/pa/send_message';
    await axios.post(viberUrl, {
      receiver: userMap.viberId,
      min_api_version: 1,
      sender: {
        name: "RA CPC1HN Bot"
      },
      type: "text",
      text: message
    }, {
      headers: {
        'X-Viber-Auth-Token': token,
        'Content-Type': 'application/json'
      }
    });
    console.log(`[Viber Notify Success] Sent message to ${employeeName} via Viber.`);
  } catch (err) {
    console.error(`[Viber Notify Error] Failed to notify ${employeeName}:`, err.response?.data || err.message);
  }
}


// Get all KPI records
app.get('/api/kpi/records', authenticateToken, (req, res) => {
  try {
    let kpis = readKpis();
    // Non-admin users can only see their own records
    if (req.user.role !== 'admin') {
      kpis = kpis.filter(k => k.username === req.user.username);
    }
    res.json(kpis);
  } catch (err) {
    console.error("Error fetching KPI records:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách KPI" });
  }
});

// Admin Route: Delete KPI record
app.delete('/api/kpi/records/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const kpis = readKpis();
    const idx = kpis.findIndex(k => k.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi KPI" });
    }
    kpis.splice(idx, 1);
    writeKpis(kpis);
    res.json({ message: "Xóa bản ghi KPI thành công!" });
  } catch (err) {
    console.error("Error deleting KPI record:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi xóa bản ghi KPI" });
  }
});

// Submit / Update KPI plan (month format: YYYY-MM)
app.post('/api/kpi/plan', authenticateToken, (req, res) => {
  const { month, baseKpiTarget, metrics, englishGroup, avgTestScore, trainingQuestion, isDraft } = req.body;
  if (!month || baseKpiTarget === undefined || !metrics) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin kế hoạch" });
  }

  try {
    const kpis = readKpis();
    const existingIdx = kpis.findIndex(k => k.username === req.user.username && k.month === month);

    const recordData = {
      id: existingIdx !== -1 ? kpis[existingIdx].id : 'kpi_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000),
      employeeName: req.user.employeeName,
      username: req.user.username,
      month,
      status: isDraft ? 'plan_draft' : 'plan_pending',
      baseKpiTarget: Number(baseKpiTarget) || 0,
      englishGroup: englishGroup || '',
      avgTestScore: avgTestScore !== undefined && avgTestScore !== '' ? Number(avgTestScore) : null,
      trainingQuestion: trainingQuestion || '',
      planCreatedAt: new Date().toISOString(),
      planApprovedBy: null,
      planApprovedAt: null,
      planComment: '',
      reportCreatedAt: existingIdx !== -1 ? kpis[existingIdx].reportCreatedAt : null,
      reportApprovedBy: null,
      reportApprovedAt: null,
      reportComment: '',
      metrics: metrics.map(m => ({
        category: m.category,
        title: m.title,
        content: m.content || '',
        isOkr: !!m.isOkr,
        baseKpi: Number(m.baseKpi) || 0,
        quantity: Number(m.quantity) || 0,
        errorCount: Number(m.errorCount) || 0,
        totalKpi: m.totalKpi !== undefined ? Number(m.totalKpi) : (Number(m.baseKpi) || 0) * (Number(m.quantity) || 0),
        explanation: m.explanation || ''
      }))
    };

    if (existingIdx !== -1) {
      const current = kpis[existingIdx];
      if (current.status === 'report_pending' || current.status === 'report_approved') {
        return res.status(400).json({ error: "Không thể chỉnh sửa kế hoạch khi báo cáo đã được nộp hoặc phê duyệt" });
      }
      kpis[existingIdx] = recordData;
    } else {
      kpis.push(recordData);
    }

    writeKpis(kpis);
    res.json({ 
      message: isDraft ? "Lưu nháp kế hoạch KPI thành công!" : "Đăng ký kế hoạch KPI thành công!", 
      record: recordData 
    });
  } catch (err) {
    console.error("Error saving KPI plan:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lưu kế hoạch KPI" });
  }
});

// Admin Approve / Reject KPI plan
app.post('/api/kpi/plan/approve', authenticateToken, requireAdmin, (req, res) => {
  const { recordId, approve, comment, metrics } = req.body;
  if (!recordId) {
    return res.status(400).json({ error: "Thiếu ID bản ghi KPI" });
  }

  try {
    const kpis = readKpis();
    const idx = kpis.findIndex(k => k.id === recordId);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi KPI" });
    }

    const record = kpis[idx];
    if (record.status !== 'plan_pending') {
      return res.status(400).json({ error: "Kế hoạch không ở trạng thái chờ duyệt" });
    }

    // Update OKR tags in metrics if sent by admin
    if (metrics && Array.isArray(metrics)) {
      metrics.forEach((m, mIdx) => {
        if (record.metrics[mIdx]) {
          record.metrics[mIdx].isOkr = !!m.isOkr;
        }
      });
    }

    record.status = approve ? 'plan_approved' : 'plan_rejected';
    record.planApprovedBy = req.user.employeeName;
    record.planApprovedAt = new Date().toISOString();
    record.planComment = comment || '';

    // Add real-time & Viber notification
    const msg = approve 
      ? `Kế hoạch KPI tháng ${record.month} của bạn đã được phê duyệt! 🎉`
      : `Kế hoạch KPI tháng ${record.month} của bạn đã bị từ chối. Lý do: ${comment || 'Không có lý do chi tiết.'}`;
    addNotification(record.username, record.employeeName, msg, approve ? 'success' : 'error');

    writeKpis(kpis);
    res.json({ message: approve ? "Phê duyệt kế hoạch thành công!" : "Từ chối kế hoạch thành công!", record });
  } catch (err) {
    console.error("Error approving KPI plan:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi duyệt kế hoạch KPI" });
  }
});

// Submit / Update KPI report (actual values)
app.post('/api/kpi/report', authenticateToken, (req, res) => {
  const { recordId, metrics, englishGroup, avgTestScore, trainingQuestion } = req.body;
  if (!recordId || !metrics) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin báo cáo" });
  }

  try {
    const kpis = readKpis();
    const idx = kpis.findIndex(k => k.id === recordId && k.username === req.user.username);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi KPI" });
    }

    const record = kpis[idx];
    if (record.status !== 'plan_approved' && record.status !== 'report_pending' && record.status !== 'report_rejected') {
      return res.status(400).json({ error: "Chỉ được nộp báo cáo khi kế hoạch đã được duyệt" });
    }

    record.status = 'report_pending';
    record.reportComment = '';
    record.reportApprovedBy = null;
    record.reportApprovedAt = null;
    record.englishGroup = englishGroup || '';
    record.avgTestScore = avgTestScore !== undefined && avgTestScore !== '' ? Number(avgTestScore) : null;
    record.trainingQuestion = trainingQuestion || '';
    record.reportCreatedAt = new Date().toISOString();
    record.metrics = metrics.map(m => ({
      category: m.category,
      title: m.title,
      content: m.content || '',
      isOkr: !!m.isOkr,
      baseKpi: Number(m.baseKpi) || 0,
      quantity: Number(m.quantity) || 0,
      errorCount: Number(m.errorCount) || 0,
      totalKpi: m.totalKpi !== undefined ? Number(m.totalKpi) : (Number(m.baseKpi) || 0) * (Number(m.quantity) || 0),
      explanation: m.explanation || ''
    }));

    writeKpis(kpis);
    res.json({ message: "Nộp báo cáo KPI tháng thành công!", record });
  } catch (err) {
    console.error("Error saving KPI report:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi nộp báo cáo KPI" });
  }
});

// Admin Approve / Reject KPI report
app.post('/api/kpi/report/approve', authenticateToken, requireAdmin, (req, res) => {
  const { recordId, approve, comment, metrics } = req.body;
  if (!recordId) {
    return res.status(400).json({ error: "Thiếu ID bản ghi KPI" });
  }

  try {
    const kpis = readKpis();
    const idx = kpis.findIndex(k => k.id === recordId);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi KPI" });
    }

    const record = kpis[idx];
    if (record.status !== 'report_pending') {
      return res.status(400).json({ error: "Báo cáo không ở trạng thái chờ duyệt" });
    }

    // Update OKR tags in metrics if sent by admin
    if (metrics && Array.isArray(metrics)) {
      metrics.forEach((m, mIdx) => {
        if (record.metrics[mIdx]) {
          record.metrics[mIdx].isOkr = !!m.isOkr;
        }
      });
    }

    record.status = approve ? 'report_approved' : 'report_rejected';
    record.reportApprovedBy = req.user.employeeName;
    record.reportApprovedAt = new Date().toISOString();
    record.reportComment = comment || '';

    // Add real-time & Viber notification
    const msg = approve 
      ? `Báo cáo KPI tháng ${record.month} của bạn đã được phê duyệt! 🎉`
      : `Báo cáo KPI tháng ${record.month} của bạn đã bị từ chối. Lý do: ${comment || 'Không có lý do chi tiết.'}`;
    addNotification(record.username, record.employeeName, msg, approve ? 'success' : 'error');

    writeKpis(kpis);
    res.json({ message: approve ? "Phê duyệt báo cáo thành công!" : "Từ chối báo cáo thành công!", record });
  } catch (err) {
    console.error("Error approving KPI report:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi duyệt báo cáo KPI" });
  }
});

// Admin Save Aggregate Review (Okr count, rewards, explanations)
app.post('/api/kpi/records/:id/review', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { okrCount, rewardOkr, rewardKpi, rewardCheckHs, rewardOther, commentReason, commentDept } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Thiếu ID bản ghi KPI" });
  }

  try {
    const kpis = readKpis();
    const idx = kpis.findIndex(k => k.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi KPI" });
    }

    kpis[idx].okrCount = okrCount !== undefined ? Number(okrCount) : null;
    kpis[idx].rewardOkr = rewardOkr !== undefined ? Number(rewardOkr) : null;
    kpis[idx].rewardKpi = rewardKpi !== undefined ? Number(rewardKpi) : null;
    kpis[idx].rewardCheckHs = rewardCheckHs !== undefined ? Number(rewardCheckHs) : null;
    kpis[idx].rewardOther = rewardOther !== undefined ? Number(rewardOther) : null;
    kpis[idx].commentReason = commentReason !== undefined ? commentReason : '';
    kpis[idx].commentDept = commentDept !== undefined ? commentDept : '';

    writeKpis(kpis);
    res.json({ message: "Cập nhật đánh giá và thưởng thành công!", record: kpis[idx] });
  } catch (err) {
    console.error("Error saving aggregate review:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lưu đánh giá thưởng" });
  }
});

// KPI summaries helpers
const SUMMARIES_FILE = path.join(DATA_DIR, 'kpi_summaries.json');

const readSummaries = () => {
  if (!fs.existsSync(SUMMARIES_FILE)) {
    fs.writeFileSync(SUMMARIES_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(SUMMARIES_FILE, 'utf8'));
};

const writeSummaries = (data) => {
  fs.writeFileSync(SUMMARIES_FILE, JSON.stringify(data, null, 2));
};

// Summary endpoints
app.get('/api/kpi/summary/:month', authenticateToken, (req, res) => {
  const { month } = req.params;
  try {
    const summaries = readSummaries();
    res.json(summaries[month] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi đọc dữ liệu tổng hợp" });
  }
});

app.post('/api/kpi/summary/:month', authenticateToken, requireAdmin, (req, res) => {
  const { month } = req.params;
  const { counts } = req.body;
  if (!counts) {
    return res.status(400).json({ error: "Thiếu dữ liệu số lượng" });
  }

  try {
    const summaries = readSummaries();
    summaries[month] = counts;
    writeSummaries(summaries);
    res.json({ message: "Lưu tổng kết hồ sơ thành công!", counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lưu dữ liệu tổng hợp" });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Regulatory Affairs backend listening on port ${PORT}`);
});
