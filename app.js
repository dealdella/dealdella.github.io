/* Deal Della - app.js
   Lógica do original (vitrine) portada: filtros combinados (categoria + busca + ordem),
   salvos em localStorage ('dd-salvos', mesma chave do original), estado vazio e carrossel de destaques.
   Nada aqui injeta HTML a partir de dados externos (só textContent / atributos). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'dd-salvos';

  const cards = $$('.card');
  cards.forEach((c, i) => {
    c.dataset.i = i;
    c.dataset.tn = norm(c.dataset.t || (c.querySelector('h2') || {}).textContent);
  });

  /* ---------- Salvos ---------- */
  let salvos = [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    salvos = Array.isArray(v) ? v.map(String) : [];
  } catch (e) { salvos = []; }

  const gravar = () => { try { localStorage.setItem(KEY, JSON.stringify(salvos)); } catch (e) { /* modo privado */ } };

  const marcar = (card) => {
    const b = $('.salvar', card);
    if (!b) return;
    const on = salvos.includes(card.dataset.id);
    b.setAttribute('aria-pressed', String(on));
    const t = $('.salvar-txt', b);
    if (t) t.textContent = on ? 'Salvo' : 'Salvar';
    else b.textContent = on ? '♥ Salvo' : '♡ Salvar';   // markup antigo, sem span
  };

  /* ---------- Filtros + ordenação ---------- */
  const estado = { cat: '', busca: '', ordem: '' };
  const vazio = $('#vazio');

  const passa = (c) => {
    const catOk = !estado.cat ||
      (estado.cat === '__salvos' ? salvos.includes(c.dataset.id) : c.dataset.cat === estado.cat);
    const buscaOk = !estado.busca || c.dataset.tn.includes(estado.busca);
    return catOk && buscaOk;
  };

  function aplicar() {
    let visiveis = 0;
    cards.forEach((c) => {
      const ok = passa(c);
      c.hidden = !ok;
      if (ok && c.closest('.grade')) visiveis++;
    });

    $$('.grade').forEach((g) => {
      const k = estado.ordem;
      Array.from(g.children)
        .sort((a, b) => {
          if (!k) return a.dataset.i - b.dataset.i;
          const x = Number(a.dataset[k]), y = Number(b.dataset[k]);
          return k === 'preco' ? x - y : y - x;
        })
        .forEach((c) => g.appendChild(c));
    });

    $$('.bloco').forEach((s) => { s.hidden = !$$('.card', s).some((c) => !c.hidden); });
    if (vazio) vazio.hidden = visiveis > 0;

    if (trilho) trilho.scrollTo({ left: 0, behavior: 'auto' });
    montarPontos();
  }

  function definirCategoria(f) {
    estado.cat = f;
    $$('.chip').forEach((x) => {
      const on = x.dataset.f === f;
      x.classList.toggle('ativo', on);
      x.setAttribute('aria-pressed', String(on));
    });
    aplicar();
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-f]');
    if (!el) return;
    definirCategoria(el.dataset.f);
  });

  const busca = $('#busca');
  if (busca) busca.addEventListener('input', (e) => { estado.busca = norm(e.target.value); aplicar(); });
  const ordem = $('#ordem');
  if (ordem) ordem.addEventListener('change', (e) => { estado.ordem = e.target.value; aplicar(); });

  cards.forEach((c) => {
    marcar(c);
    const b = $('.salvar', c);
    if (!b) return;
    b.addEventListener('click', () => {
      const id = c.dataset.id, k = salvos.indexOf(id);
      if (k >= 0) salvos.splice(k, 1); else salvos.push(id);
      gravar();
      cards.forEach((x) => { if (x.dataset.id === id) marcar(x); });   // sincroniza hero e grade
      if (estado.cat === '__salvos') aplicar();
    });
  });

  /* ---------- Carrossel de destaques ---------- */
  const trilho = $('#trilho');
  const pontos = $('#pontos');
  const navd = $('.navd');
  const destaques = $('.destaques');

  const slides = () => (trilho ? Array.from(trilho.children).filter((s) => !s.hidden) : []);
  const atual = () => {
    const v = slides(); if (!v.length) return 0;
    const x = trilho.scrollLeft; let k = 0;
    v.forEach((s, i) => { if (Math.abs(s.offsetLeft - x) < Math.abs(v[k].offsetLeft - x)) k = i; });
    return k;
  };
  const ir = (i) => {
    const v = slides(); if (!v.length) return;
    i = (i + v.length) % v.length;
    trilho.scrollTo({ left: v[i].offsetLeft, behavior: calmo ? 'auto' : 'smooth' });
  };
  const marcarPonto = () => {
    if (!pontos) return;
    const k = atual();
    Array.from(pontos.children).forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
  };

  let auto = null, pausa = false;
  const parar = () => { if (auto) { clearInterval(auto); auto = null; } };

  function montarPontos() {
    if (!trilho) return;
    const v = slides();
    if (destaques) destaques.hidden = v.length === 0;
    if (navd) navd.hidden = v.length < 2;
    v.forEach((s, i) => s.setAttribute('aria-label', `${i + 1} de ${v.length}`));
    if (!pontos) return;
    pontos.textContent = '';
    v.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir para o destaque ${i + 1}`);
      b.addEventListener('click', () => { parar(); ir(i); });
      pontos.appendChild(b);
    });
    marcarPonto();
  }

  if (trilho) {
    let quadro = null;
    trilho.addEventListener('scroll', () => {
      if (!quadro) quadro = requestAnimationFrame(() => { quadro = null; marcarPonto(); });
    });
    $$('.seta').forEach((b) => b.addEventListener('click', () => { parar(); ir(atual() + Number(b.dataset.d)); }));
    trilho.addEventListener('pointerdown', parar);
    trilho.addEventListener('focusin', parar);
    const caixa = trilho.parentNode;
    caixa.addEventListener('mouseenter', () => { pausa = true; });
    caixa.addEventListener('mouseleave', () => { pausa = false; });
    trilho.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); parar(); ir(atual() + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
    if (!calmo && slides().length > 1) {
      auto = setInterval(() => { if (!pausa && !document.hidden) ir(atual() + 1); }, 7000);
    }
  }

  /* ---------- Altura do topo fixo ----------
     --hh = altura do cabeçalho (a barra de filtros gruda logo abaixo dele no desktop).
     A folga de rolagem soma só o que está fixo, para o título de uma âncora não ficar escondido. */
  const topo = $('.site-header');
  const barra = $('.barra-filtros');
  const medir = () => {
    if (!topo) return;
    const h = topo.offsetHeight;
    document.documentElement.style.setProperty('--hh', h + 'px');
    const fixa = barra && getComputedStyle(barra).position === 'sticky' ? barra.offsetHeight : 0;
    document.documentElement.style.scrollPaddingTop = (h + fixa + 12) + 'px';
  };
  medir();
  window.addEventListener('resize', medir);

  definirCategoria('');
})();
