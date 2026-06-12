export async function handler(event) {
  const targetPath = event.path.replace('/.netlify/functions/apisetu-edistricttn-proxy', '');
  const url = `https://apisetu.gov.in/certificate/v3/edistricttn${targetPath}${event.rawQuery ? '?' + event.rawQuery : ''}`;
  
  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...event.headers,
      },
      body: event.body || undefined,
    });
    const data = await response.text();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: data,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
