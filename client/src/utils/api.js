export async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('brolaws_session_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, options);
    
    // Auto-wipe session and reload on unauthorized access
    if (response.status === 401) {
      localStorage.removeItem('brolaws_session_token');
      window.location.reload();
      throw new Error('Unauthorized session.');
    }
    
    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        const json = JSON.parse(errText);
        errMsg = json.message || errText;
      } catch (e) {}
      throw new Error(errMsg || `Request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Request error on ${endpoint}:`, error);
    throw error;
  }
}
