const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const kbPath = path.join(__dirname, 'registration_kb.json');
let kb = null;

try {
  kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
} catch (err) {
  console.error("Error loading registration_kb.json in chatbotHelper:", err);
}

// Function to normalize string for keyword matching
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[đĐ]/g, 'd')
    .trim();
}

// Map keywords to categories in KB
const keywordMap = {
  thuoc: ['thuoc', 'duoc', 'drug', 'medicine', 'hoat chat', 'be', 'tuong duong sinh hoc', 'kiem soat dac biet', 'ke don', 'danhmuc', 'dav', 'cuc quan ly duoc'],
  tpcn: ['thuc pham chuc nang', 'tpcn', 'tpbvsk', 'bao ve suc khoe', 'dinh duong', 'thuc pham', 'vfa', 'cuc an toan thuc pham', 'gmp thuc pham', 'nd 46', 'nghi dinh 46'],
  ttb: ['trang thiet bi', 'thiet bi y te', 'ttb', 'thiet bi', 'vat tu y te', 'iso 13485', 'csdt', 'phan loai', 'loai a', 'loai b', 'loai c', 'loai d', 'nd 04', 'nghi dinh 04'],
  mp: ['my pham', 'cosmetic', 'kem', 'son', 'dau goi', 'sua tam', 'nuoc hoa', 'tt 34', 'thong tu 34', 'ghi nhan my pham', 'quang cao my pham'],
  sat_khuan: ['hoa chat', 'sat khuan', 'diet con trung', 'che pham', 'y te', 've sinh', 'tt 05', 'thong tu 05', 'hoa chat sat khuan'],
  thong_thuong: ['san pham thong thuong', 'thong thuong', 'tccs', 'tcvn', 'tieu chuan co so', 'cong bo tieu chuan']
};

// Identify all categories mentioned in the query or history
function identifyCategories(message, history = []) {
  let combinedText = message;
  if (history && history.length > 0) {
    combinedText += " " + history.map(h => h.text).join(" ");
  }
  const normMessage = normalizeText(combinedText);
  const matchedCats = [];

  for (const [cat, keywords] of Object.entries(keywordMap)) {
    let matched = false;
    keywords.forEach(kw => {
      if (normMessage.includes(kw)) {
        matched = true;
      }
    });
    if (matched) {
      matchedCats.push(cat);
    }
  }
  return matchedCats;
}

// Function to generate offline response when API is not available
function generateOfflineResponse(message, matchedCats) {
  if (!kb || !kb.categories) {
    return "Hệ thống tri thức hiện đang bận. Vui lòng thử lại sau.";
  }

  if (!matchedCats || matchedCats.length === 0) {
    // General response when no category is matched
    return `Chào bạn! Tôi là **Trợ lý Đăng ký**. Tôi có thể hỗ trợ giải đáp các câu hỏi liên quan đến thủ tục đăng ký và công bố tại Việt Nam cho 6 nhóm sản phẩm:
1. **Thuốc & Nguyên liệu làm thuốc** (Luật Dược 2024, Nghị định 163/2025/NĐ-CP, Thông tư 12/2025/TT-BYT)
2. **Thực phẩm chức năng / TPBVSK** (Nghị định 46/2026/NĐ-CP)
3. **Trang thiết bị y tế** (Nghị định 04/2025/NĐ-CP)
4. **Mỹ phẩm** (Thông tư 34/2025/TT-BYT)
5. **Hóa chất sát khuẩn** (Thông tư 05/2026/TT-BYT)
6. **Sản phẩm thông thường** (Tiêu chuẩn cơ sở TCCS/TCVN)

*Bạn hãy vui lòng nhập câu hỏi rõ ràng hoặc đề cập đến loại sản phẩm bạn cần tư vấn để tôi hỗ trợ chính xác nhất!*`;
  }

  let response = `### 🤖 Trợ lý Đăng ký - Kết quả tra cứu nhanh (Offline Fallback)\n\n`;
  response += `*Tôi phát hiện câu hỏi của bạn liên quan đến: **${matchedCats.map(c => kb.categories[c].title).join(', ')}**.*\n\n`;

  matchedCats.forEach(cat => {
    const catData = kb.categories[cat];
    if (!catData) return;

    response += `#### 📦 Nhóm: **${catData.title}**\n`;
    response += `**- Văn bản pháp lý:** ${catData.legalBasis.slice(0, 3).join(', ')} (và các thông tư liên quan)\n`;
    response += `**- Cơ quan thẩm quyền:** ${catData.authority}\n`;
    response += `**- Thời gian xử lý:** ${catData.timeline}\n`;
    
    // Check if there's any matching FAQ in this category
    const normMessage = normalizeText(message);
    let matchedFaq = null;
    if (catData.faqs) {
      catData.faqs.forEach(faq => {
        const qNorm = normalizeText(faq.question);
        const words = qNorm.split(' ');
        let matches = 0;
        words.forEach(w => {
          if (w.length > 2 && normMessage.includes(w)) {
            matches++;
          }
        });
        if (matches >= 3) {
          matchedFaq = faq;
        }
      });
    }

    if (matchedFaq) {
      response += `👉 **Câu hỏi liên quan:** *${matchedFaq.question}*\n`;
      response += `   *Trả lời:* ${matchedFaq.answer}\n`;
    }

    if (matchedCats.length === 1) {
      // If only one category, show full details as before
      response += `**- Hồ sơ yêu cầu:**\n`;
      catData.dossierChecklist.forEach(item => {
        response += `  * ${item}\n`;
      });
      response += `**- Các bước thực hiện:**\n`;
      catData.steps.forEach(step => {
        response += `  * ${step}\n`;
      });
    } else {
      response += `*(Để xem chi tiết danh mục hồ sơ và các bước đăng ký đầy đủ cho nhóm này, vui lòng hỏi chi tiết về sản phẩm đó)*\n`;
    }
    response += `\n---\n\n`;
  });

  return response;
}

async function queryChatbot(message, history = []) {
  const matchedCats = identifyCategories(message, history);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("No GEMINI_API_KEY found, running in offline mode.");
    return generateOfflineResponse(message, matchedCats);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Prepare the regulatory knowledge base context
    const kbContext = JSON.stringify(kb, null, 2);

    const systemInstruction = `Bạn là "Trợ Lý Đăng Ký" - một chuyên gia tư vấn pháp lý đăng ký dược phẩm, mỹ phẩm, thực phẩm chức năng, trang thiết bị y tế, hóa chất sát khuẩn và sản phẩm thông thường tại Việt Nam của công ty CPC1HN.

Dưới đây là cơ sở dữ liệu pháp lý (văn bản mới nhất cập nhật 2024-2026):
${kbContext}

Hãy trả lời câu hỏi của người dùng dựa vào cơ sở dữ liệu trên.
Yêu cầu trả lời:
1. Thông tin phải chính xác, bám sát các luật mới nhất trong cơ sở dữ liệu như Luật Dược 2024, Nghị định 163/2025/NĐ-CP (về dược), Nghị định 46/2026/NĐ-CP (về thực phẩm bảo vệ sức khỏe), Thông tư 12/2025/TT-BYT (về đăng ký thuốc), Thông tư 18/2026/TT-BYT (thuốc kiểm soát đặc biệt), v.v.
2. Trả lời bằng tiếng Việt, định dạng markdown rõ ràng, sử dụng các tiêu đề, danh sách gạch đầu dòng, chữ in đậm phù hợp để dễ đọc.
3. Người dùng có thể hỏi các câu hỏi phức tạp hoặc so sánh chéo giữa nhiều danh mục sản phẩm khác nhau. Hãy dùng dữ liệu đầy đủ trong cơ sở dữ liệu để giải thích một cách hệ thống.
4. Trợ lý có bộ nhớ hội thoại ngắn hạn. Hãy liên kết thông tin với những gì người dùng vừa hỏi trong lịch sử trò chuyện để đưa ra câu trả lời mạch lạc.
5. Nếu câu hỏi không liên quan trực tiếp đến các thông tin trên hoặc nằm ngoài cơ sở dữ liệu, hãy trả lời lịch sự và hướng dẫn họ liên hệ cơ quan quản lý hoặc ban chuyên môn của công ty.
6. KHÔNG tự bịa đặt thông tin.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    // Format chat history to Gemini SDK format
    const formattedHistory = (history || []).map(h => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Start a chat session with memory
    const chat = model.startChat({
      history: formattedHistory
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API Error, falling back to offline mode:", error);
    return generateOfflineResponse(message, matchedCats);
  }
}

module.exports = {
  queryChatbot
};
