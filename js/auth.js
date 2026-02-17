// ═══ Autenticazione Hardcoded ═══
const CREDENTIALS = { id: "Silvia", password: "iosonosilvia@2026" };

function checkLogin() {
  const isLoginPage = window.location.pathname.endsWith('index.html') || 
                      window.location.pathname.endsWith('/');
  const loggedIn = sessionStorage.getItem('silvia_logged') === 'true';

  if (!isLoginPage && !loggedIn) {
    window.location.href = 'index.html';
    return false;
  }
  return loggedIn;
}

function doLogin(inputId, inputPassword) {
  if (inputId === CREDENTIALS.id && inputPassword === CREDENTIALS.password) {
    sessionStorage.setItem('silvia_logged', 'true');
    return true;
  }
  return false;
}

function doLogout() {
  sessionStorage.removeItem('silvia_logged');
  window.location.href = 'index.html';
}

// Auto-check su ogni pagina tranne login
if (!window.location.pathname.endsWith('index.html') && 
    !window.location.pathname.endsWith('/') &&
    !window.location.pathname.endsWith('seed.html')) {
  checkLogin();
}
