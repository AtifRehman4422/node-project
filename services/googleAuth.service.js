const https = require('https');

function verifyGoogleIdToken(idToken) {
  return new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error_description || json.error));
              return;
            }
            resolve({
              sub: json.sub,
              email: json.email ? String(json.email).trim().toLowerCase() : null,
              name: json.name || null,
              picture: json.picture || null,
            });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

module.exports = { verifyGoogleIdToken };
