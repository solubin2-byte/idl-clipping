// Netlify Serverless Function
// 네이버 뉴스 검색 API를 서버에서 직접 호출 (CORS 우회)
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const query   = params.query;
  const display = params.display || '10';
  const start   = params.start   || '1';

  // 환경변수에서 키 가져오기 (Netlify 대시보드에서 설정)
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Netlify 환경변수 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 설정 필요' })
    };
  }

  if (!query) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'query 파라미터 필요' }) };
  }

  try {
    const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=${display}&start=${start}&sort=date`;

    const res = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`네이버 API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message, items: [] })
    };
  }
};
