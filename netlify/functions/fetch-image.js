// Netlify Serverless Function
// 기사 URL을 받아서 og:image / twitter:image 메타태그를 추출해 반환
// CORS 없이 서버에서 직접 크롤링

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const url = event.queryStringParameters && event.queryStringParameters.url;
  if (!url) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'url 파라미터 필요' }) };
  }

  try {
    // 타임아웃 5초
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsClipper/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const html = await res.text();

    // og:image, twitter:image, 첫 번째 <img> 순서로 추출
    const ogMatch    = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const twMatch    = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
                    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    const imgMatch   = html.match(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/i);

    const imageUrl = (ogMatch && ogMatch[1])
                  || (twMatch && twMatch[1])
                  || (imgMatch && imgMatch[1])
                  || null;

    // 상대경로면 절대경로로 변환
    let finalUrl = imageUrl;
    if (finalUrl && finalUrl.startsWith('/')) {
      const base = new URL(url);
      finalUrl = base.origin + finalUrl;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl: finalUrl, source: url })
    };

  } catch (e) {
    return {
      statusCode: 200, // 에러도 200으로 반환 (프론트에서 null 처리)
      headers,
      body: JSON.stringify({ imageUrl: null, error: e.message })
    };
  }
};
