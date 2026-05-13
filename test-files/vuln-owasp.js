// OWASP Vulnerability Test File

async function login(username, password) {
  // A07:2021 - Identification and Authentication Failures
  // Plaintext password comparison
  if (password === 'admin123') {
    const user_id = '12345';
    // A01:2021 - Broken Access Control
    // Storing data in localStorage without proper auth handling
    localStorage.setItem('user_id', user_id);
    return true;
  }
  return false;
}

function hashToken(token) {
  // A02:2021 - Cryptographic Failures
  // Use of MD5 is insecure
  return md5(token);
}

const unsafeContent = "<img src=x onerror=alert(1)>";
// A03:2021 - Injection
// Potential XSS
document.getElementById('output').innerHTML = unsafeContent;
