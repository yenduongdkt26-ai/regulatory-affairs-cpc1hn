const axios = require('axios');

async function testReindexAndQuery() {
  try {
    console.log("1. Logging in...");
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: '0999999999',
      password: '0999999999'
    });
    const token = loginRes.data.token;
    console.log("Login successful. Token acquired.");

    const headers = { Authorization: `Bearer ${token}` };

    console.log("\n2. Triggering database re-indexing (RAG Vector Chunks)...");
    const reindexRes = await axios.post('http://localhost:5000/api/legal/reindex', {}, { headers });
    console.log("Reindex Result:", JSON.stringify(reindexRes.data, null, 2));

    console.log("\n3. Creating new chat conversation...");
    const convRes = await axios.post('http://localhost:5000/api/chatbot/conversations', {
      title: 'Hỏi về quy định nhãn và BE'
    }, { headers });
    const convId = convRes.data.id;
    console.log(`Created conversation ID: ${convId}`);

    console.log("\n4. Querying RAG Chatbot about Bioequivalence (Thông tư 07/2022)...");
    const queryRes1 = await axios.post('http://localhost:5000/api/chatbot/query-rag', {
      conversationId: convId,
      message: "Hoạt chất Metformin và Amlodipine có bắt buộc phải thử tương đương sinh học generic không, theo thông tư nào?"
    }, { headers });
    console.log("=== Bot RAG Reply (Tương đương sinh học generic) ===");
    console.log(queryRes1.data.text);
    console.log("Sources cited:", queryRes1.data.sources.map(s => `${s.document_number} - ${s.title}`));

    console.log("\n5. Querying RAG Chatbot about Labeling QR codes (Văn bản hợp nhất 01/2024)...");
    const queryRes2 = await axios.post('http://localhost:5000/api/chatbot/query-rag', {
      conversationId: convId,
      message: "Quy định về việc in mã QR link đến hướng dẫn sử dụng điện tử trên nhãn thuốc như thế nào?"
    }, { headers });
    console.log("=== Bot RAG Reply (Nhãn mã QR điện tử) ===");
    console.log(queryRes2.data.text);
    console.log("Sources cited:", queryRes2.data.sources.map(s => `${s.document_number} - ${s.title}`));

  } catch (err) {
    console.error("Test failed:", err.message);
    if (err.response) {
      console.error("Error response data:", err.response.data);
    }
  }
}

testReindexAndQuery();
