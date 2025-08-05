import axios from 'axios';

export const fetchCafeTrends = async (question) => {
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3-sonar-small-32k-online',
        messages: [{ role: 'user', content: question }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) return '응답 없음';

     try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (e) {
      return content; // 파싱 실패 시 그냥 원문 리턴
    }
  } catch (error) {
    console.error('Perplexity API 호출 오류:', error.response?.data || error.message);
    throw new Error('Perplexity API 호출 실패');
  }
};