// Ligne de liste : un nom + des boutons d'action
function row(name, actions) {
  const li = el('li');
  li.append(el('span', name));
  const box = el('span', null, 'actions');
  for (const [label, handler, cls] of actions) {
    const b = el('button', label, cls);
    b.addEventListener('click', async () => { await handler(); loadFriends(); });
    box.append(b);
  }
  li.append(box);
  return li;
}

function fill(listId, items, emptyText, toRow) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  if (!items.length) list.append(el('li', emptyText, 'muted'));
  for (const item of items) list.append(toRow(item));
}

async function loadFriends() {
  const data = await api('GET', '/api/friends');

  fill('incoming', data.incoming, 'Aucune demande', (r) => row(r.username, [
    ['Accepter', () => api('POST', `/api/friends/requests/${r.id}/accept`)],
    ['Refuser', () => api('DELETE', `/api/friends/requests/${r.id}`), 'link'],
  ]));

  fill('friends', data.friends, "Vous n'avez pas encore d'amis", (f) => row(f.username, [
    ['Chat', () => { location.href = '/chat.html?user=' + f.id; }],
    ['Retirer', () => confirm(`Retirer ${f.username} de vos amis ?`) && api('DELETE', '/api/friends/' + f.id), 'link'],
  ]));

  fill('outgoing', data.outgoing, 'Aucune demande en attente', (r) => row(r.username, [
    ['Annuler', () => api('DELETE', `/api/friends/requests/${r.id}`), 'link'],
  ]));
}

document.addEventListener('DOMContentLoaded', async () => {
  const me = await renderNav();
  if (!me) { location.href = '/login.html'; return; }

  const form = document.getElementById('add-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('add-error');
    error.textContent = '';
    try {
      await api('POST', '/api/friends', { username: form.username.value.trim() });
      form.reset();
      loadFriends();
    } catch (err) {
      error.textContent = err.message;
    }
  });

  loadFriends();
});
