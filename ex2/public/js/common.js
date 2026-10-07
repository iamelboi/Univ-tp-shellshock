// Fonctions partagées : appels API + barre de navigation

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Erreur ' + res.status);
  return data;
}

function formatDate(sqlDate) {
  return new Date(sqlDate.replace(' ', 'T') + 'Z').toLocaleString('fr-FR');
}

// Crée un élément avec du texte (textContent, jamais innerHTML)
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function renderNav() {
  const nav = document.querySelector('nav');
  const me = await api('GET', '/api/me');
  nav.innerHTML = '';
  const brand = el('a', 'Agora', 'brand');
  brand.href = '/';
  nav.append(brand);

  const link = (href, text) => { const a = el('a', text); a.href = href; nav.append(a); return a; };
  link('/', 'Posts');

  if (me) {
    link('/friends.html', 'Amis');
    link('/chat.html', 'Chat');
    nav.append(el('span', me.username, 'user'));
    const out = link('#', 'Déconnexion');
    out.addEventListener('click', async (e) => {
      e.preventDefault();
      await api('POST', '/api/logout');
      location.href = '/';
    });
  } else {
    link('/login.html', 'Connexion');
    link('/register.html', 'Inscription');
  }
  return me;
}
