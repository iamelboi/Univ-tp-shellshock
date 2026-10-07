let me = null;
let currentUserId = null;

async function loadConversations() {
  const list = document.getElementById('conversations');
  const convs = await api('GET', '/api/conversations');
  list.innerHTML = '';
  if (!convs.length) list.append(el('li', 'Aucune conversation', 'muted'));

  for (const c of convs) {
    const li = el('li');
    if (c.user_id === currentUserId) li.className = 'active';
    const name = el('strong', c.username);
    li.append(name);
    if (c.unread) li.append(el('span', c.unread, 'badge'));
    li.append(el('div', c.last_message, 'preview'));
    li.addEventListener('click', () => openConversation(c.user_id, c.username));
    list.append(li);
  }
}

async function openConversation(userId, username) {
  currentUserId = userId;
  const title = document.getElementById('thread-title');
  title.textContent = 'Conversation avec ' + username;
  title.classList.remove('muted');
  document.getElementById('reply-form').hidden = false;

  const thread = document.getElementById('thread');
  const msgs = await api('GET', '/api/messages/' + userId);
  thread.innerHTML = '';
  for (const m of msgs) {
    const bubble = el('div', m.content, 'msg' + (m.sender_id === me.id ? ' mine' : ''));
    bubble.append(el('div', formatDate(m.created_at), 'meta'));
    thread.append(bubble);
  }
  thread.scrollTop = thread.scrollHeight;
  loadConversations();
}

// Les destinataires possibles sont uniquement les amis
async function loadFriends() {
  const select = document.getElementById('new-recipient');
  const { friends } = await api('GET', '/api/friends');
  if (!friends.length) {
    document.getElementById('new-form').hidden = true;
    document.getElementById('no-friends').hidden = false;
  }
  for (const u of friends) {
    const opt = el('option', u.username);
    opt.value = u.id;
    select.append(opt);
  }
  return friends;
}

document.addEventListener('DOMContentLoaded', async () => {
  me = await renderNav();
  if (!me) { location.href = '/login.html'; return; }

  // Réponse dans la conversation ouverte
  const reply = document.getElementById('reply-form');
  reply.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = reply.content.value.trim();
    if (!content) return;
    await api('POST', '/api/messages', { recipient_id: currentUserId, content });
    reply.reset();
    const title = document.getElementById('thread-title').textContent.replace('Conversation avec ', '');
    openConversation(currentUserId, title);
  });

  // Nouveau message
  const form = document.getElementById('new-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('new-error');
    error.textContent = '';
    try {
      const select = form.recipient;
      await api('POST', '/api/messages', {
        recipient_id: Number(select.value),
        content: form.content.value.trim(),
      });
      form.reset();
      openConversation(Number(select.value), select.options[select.selectedIndex].text);
    } catch (err) {
      error.textContent = err.message;
    }
  });

  const friends = await loadFriends();
  loadConversations();

  // Ouverture directe depuis la page Amis : /chat.html?user=ID
  const target = Number(new URLSearchParams(location.search).get('user'));
  const friend = friends.find((f) => f.id === target);
  if (friend) openConversation(friend.id, friend.username);
});
