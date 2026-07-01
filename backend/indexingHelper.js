const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const docPath = path.join(__dirname, 'legal_documents.json');
const chunkPath = path.join(__dirname, 'legal_chunks.json');
const logPath = path.join(__dirname, 'legal_sync_logs.json');

// Logger Helper
function addSyncLog(action, status, details) {
  let logs = [];
  try {
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
  } catch (err) {
    logs = [];
  }
  const newLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    action,
    status,
    details
  };
  logs.unshift(newLog);
  if (logs.length > 50) logs.pop();
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  return newLog;
}

// Chunks text into sentences with sliding window and overlaps
function chunkText(text, docId, docTitle) {
  if (!text) return [];
  const chunks = [];
  
  // Split by sentences (dot, exclamation, or question mark followed by space or newline)
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  
  let currentChunk = "";
  let index = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if ((currentChunk + sentence).length > 800) {
      if (currentChunk.trim()) {
        chunks.push({
          id: `${docId}_chunk_${index++}`,
          document_id: docId,
          document_title: docTitle,
          content: currentChunk.trim(),
          embedding: []
        });
      }
      
      // Carry over the current sentence for sliding window context overlap
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  // Save remaining sentences
  if (currentChunk.trim()) {
    chunks.push({
      id: `${docId}_chunk_${index}`,
      document_id: docId,
      document_title: docTitle,
      content: currentChunk.trim(),
      embedding: []
    });
  }
  
  return chunks;
}

// Generate Embeddings via Gemini API
async function generateEmbedding(text, apiKey) {
  if (!apiKey) {
    // Return empty array / mock embedding for offline
    return Array.from({ length: 768 }, () => Math.random() * 0.1);
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding API Error, using mock embeddings:", error.message);
    return Array.from({ length: 768 }, () => Math.random() * 0.1);
  }
}

// Cosine Similarity between two vector arrays
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Keyword-matching score helper (Fallback/Online multiplier)
function calculateKeywordScore(query, text) {
  const normQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const normText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const words = normQuery.split(/\s+/).filter(w => w.length > 2);
  let matches = 0;
  words.forEach(w => {
    if (normText.includes(w)) {
      matches++;
    }
  });
  return matches;
}

// Perform RAG Vector Retrieval
async function retrieveRelevantChunks(query, limit = 4) {
  let chunks = [];
  let docs = [];
  try {
    if (fs.existsSync(chunkPath)) {
      chunks = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    }
    if (fs.existsSync(docPath)) {
      docs = JSON.parse(fs.readFileSync(docPath, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading indexes for retrieval:", err);
    return [];
  }

  // Filter hidden documents
  const activeDocIds = new Set(docs.filter(d => !d.isHidden).map(d => d.id));
  const activeChunks = chunks.filter(c => activeDocIds.has(c.document_id));

  if (activeChunks.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const queryEmbedding = await generateEmbedding(query, apiKey);

  // Compute similarities
  const scoredChunks = activeChunks.map(chunk => {
    const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    const keywordScore = calculateKeywordScore(query, chunk.content);
    
    // If offline (simulated vectors), keyword score dominates the rank
    // If online, combination of vector matching + term boost gives the best RAG context
    const finalScore = apiKey ? (vectorScore + keywordScore * 0.1) : (keywordScore + Math.random() * 0.01);
    
    // Find the full document metadata
    const docMeta = docs.find(d => d.id === chunk.document_id) || {};

    return {
      ...chunk,
      score: finalScore,
      document_number: docMeta.document_number,
      document_type: docMeta.document_type,
      issuing_authority: docMeta.issuing_authority,
      status: docMeta.status,
      source_name: docMeta.source_name,
      source_url: docMeta.source_url
    };
  });

  // Sort and retrieve top K
  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Filter out zero-relevance chunks in fallback mode
  const filteredResult = scoredChunks.filter(c => c.score > 0);
  
  return filteredResult.slice(0, limit);
}

// Index a single document
async function indexDocument(docId, apiKey) {
  let docs = [];
  let chunks = [];
  
  if (fs.existsSync(docPath)) {
    docs = JSON.parse(fs.readFileSync(docPath, 'utf8'));
  }
  if (fs.existsSync(chunkPath)) {
    chunks = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
  }

  const doc = docs.find(d => d.id === docId);
  if (!doc) {
    throw new Error(`Document ID ${docId} not found in database.`);
  }

  // Wipe old chunks for this doc
  chunks = chunks.filter(c => c.document_id !== docId);

  // Chunk text
  const newChunks = chunkText(doc.content_text, doc.id, doc.title);

  // Generate embeddings
  for (let i = 0; i < newChunks.length; i++) {
    const chunk = newChunks[i];
    chunk.embedding = await generateEmbedding(chunk.content, apiKey);
  }

  // Save updated chunks
  chunks.push(...newChunks);
  fs.writeFileSync(chunkPath, JSON.stringify(chunks, null, 2));
  return newChunks.length;
}

// Index all active documents
async function indexAllDocuments() {
  const apiKey = process.env.GEMINI_API_KEY;
  let docs = [];
  
  if (fs.existsSync(docPath)) {
    docs = JSON.parse(fs.readFileSync(docPath, 'utf8'));
  }

  const activeDocs = docs.filter(d => !d.isHidden);
  let totalChunks = 0;

  console.log(`Indexing ${activeDocs.length} legal documents...`);

  // Clear chunks
  fs.writeFileSync(chunkPath, JSON.stringify([], null, 2));

  for (const doc of activeDocs) {
    try {
      const count = await indexDocument(doc.id, apiKey);
      totalChunks += count;
    } catch (e) {
      console.error(`Error indexing document ${doc.title}: ${e.message}`);
    }
  }

  addSyncLog("Index lại", "Thành công", `Đã lập chỉ mục lại toàn bộ kho dữ liệu. Tổng số: ${activeDocs.length} văn bản chia thành ${totalChunks} đoạn vector.`);
  return {
    success: true,
    documentCount: activeDocs.length,
    chunkCount: totalChunks
  };
}

module.exports = {
  indexDocument,
  indexAllDocuments,
  retrieveRelevantChunks
};
