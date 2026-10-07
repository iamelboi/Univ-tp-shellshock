let me = null;

async function loadPosts() {
  const list = document.getElementById('posts');
  const posts = await api('GET', '/api/posts');
  list.innerHTML = '';
  if (!posts.length) list.append(el('p', 'Aucun post de vos amis pour le moment.', 'muted'));

  for (const p of posts) {
    const card = el('article', null, 'card');
    card.append(el('h2', p.title));
    card.append(el('div', `par ${p.author} — ${formatDate(p.created_at)}`, 'meta'));
    card.append(el('p', p.content, 'post-content'));

    const msg = el('button', 'Envoyer un message à ' + p.author);
    msg.addEventListener('click', () => { location.href = '/chat.html?user=' + p.user_id; });
    card.append(msg);
    list.append(card);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  me = await renderNav();
  if (!me) {
    document.getElementById('posts').append(
      el('p', 'Connectez-vous pour voir les posts de vos amis.', 'muted'));
    return;
  }

  const form = document.getElementById('post-form');
  form.closest('.card').hidden = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('post-error');
    error.textContent = '';
    document.getElementById('post-ok').textContent = '';
    try {
      await api('POST', '/api/posts', {
        title: form.title.value.trim(),
        content: form.content.value.trim(),
      });
      form.reset();
      error.textContent = '';
      document.getElementById('post-ok').textContent = 'Post publié : il est visible par vos amis.';
    } catch (err) {
      error.textContent = err.message;
    }
  });

  loadPosts();
});
