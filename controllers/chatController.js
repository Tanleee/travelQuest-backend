const { GoogleGenAI } = require('@google/genai');
const Tour = require('./../models/tourModel');

// Hàm helper để format tour data cho frontend
const formatToursForFrontend = (tours) => {
  return tours.map((tour) => ({
    id: tour._id.toString(),
    name: tour.name,
    description: tour.summary || tour.description,
    price: tour.price,
    duration: tour.duration,
    difficulty: tour.difficulty,
    image: tour.imageCover ? `/img/tours/${tour.imageCover}` : null,
    locations: tour.locations?.map((loc) => loc.description) || [],
    ratingsAverage: tour.ratingsAverage || 4.5
  }));
};

// Hàm parse JSON từ response của AI (xử lý markdown code blocks)
const parseAIResponse = (responseText) => {
  try {
    // Loại bỏ markdown code blocks nếu có
    let cleanText = responseText.trim();

    // Xử lý ```json ... ```
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\s*/g, '');
    }

    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Parse JSON error:', error);
    // Fallback: trả về text thuần nếu không parse được
    return {
      message: responseText,
      tourIds: []
    };
  }
};

// Controller xử lý yêu cầu chat
exports.generateContent = async (req, res) => {
  const allTours = await Tour.find();

  // Tạo danh sách tour đơn giản hóa cho AI
  const simplifiedTours = allTours.map((tour) => ({
    id: tour._id.toString(),
    name: tour.name,
    summary: tour.summary,
    price: tour.price,
    duration: tour.duration,
    difficulty: tour.difficulty,
    locations: tour.locations?.map((loc) => loc.description) || [],
    ratingsAverage: tour.ratingsAverage
  }));

  const systemPromptBase = `Bạn là trợ lý AI của TravelQuest - công ty tour du lịch miền Trung Việt Nam.

DỮ LIỆU TOUR:
${JSON.stringify(simplifiedTours, null, 2)}

QUAN TRỌNG - FORMAT TRẢ LỜI:
Bạn PHẢI trả về ĐÚNG định dạng JSON sau (không thêm bất kỳ text nào khác):

{
  "message": "Câu trả lời thân thiện bằng tiếng Việt của bạn",
  "tourIds": ["id1", "id2", "id3"]
}

QUY TẮC:
- "message": Câu giới thiệu ngắn gọn, thân thiện (2-3 câu)
- "tourIds": Mảng chứa ID của các tour phù hợp (tối đa 3-4 tour)
- Nếu không có tour phù hợp, trả về tourIds = []
- Chỉ gợi ý các tour thực sự liên quan đến câu hỏi
- KHÔNG giải thích format JSON, chỉ trả về JSON thuần túy`;

  const { userQuery } = req.body;

  if (!userQuery) {
    return res
      .status(400)
      .json({ error: 'Missing userQuery in request body.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY không được đặt trong .env');
    return res
      .status(500)
      .json({ error: 'Lỗi cấu hình Server. Vui lòng cung cấp API Key.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userQuery }] }],
      config: {
        systemInstruction: systemPromptBase,
        temperature: 0.7,
        maxOutputTokens: 1500
      }
    });

    const rawResponse = response.text.trim();
    console.log('🤖 AI Raw Response:', rawResponse);

    // Parse JSON response
    const aiData = parseAIResponse(rawResponse);

    // Lấy tours dựa trên tourIds
    let relevantTours = [];
    if (aiData.tourIds && aiData.tourIds.length > 0) {
      relevantTours = allTours.filter((tour) =>
        aiData.tourIds.includes(tour._id.toString())
      );
    }

    // Format tours cho frontend
    const formattedTours = formatToursForFrontend(relevantTours);

    // Trả về response
    res.status(200).json({
      aiResponseText: aiData.message || rawResponse,
      tours: formattedTours.length > 0 ? formattedTours : undefined
    });
  } catch (error) {
    console.error('❌ GEMINI API Error:', error);

    let errorMessage = 'Lỗi không xác định khi gọi API Gemini.';

    if (error.message.includes('API key')) {
      errorMessage =
        'Lỗi API Key. Vui lòng kiểm tra lại cấu hình GEMINI_API_KEY.';
    } else if (
      error.message.includes('403') ||
      error.message.includes('Forbidden')
    ) {
      errorMessage =
        'Lỗi 403 Forbidden. API Key không hợp lệ hoặc không có quyền.';
    } else if (error.message.includes('429')) {
      errorMessage = 'Lỗi 429 Rate Limit. Hệ thống quá tải.';
    } else if (error.message.includes('400')) {
      errorMessage =
        'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại định dạng câu hỏi.';
    }

    res.status(500).json({
      error:
        'Xin lỗi, đã có lỗi xảy ra khi kết nối đến AI. Vui lòng thử lại sau.'
    });
  }
};
