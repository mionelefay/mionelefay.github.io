"use strict";
// Compartilhamento manual, preservando a abertura do modal e avisos de situação.
(() => {
  const painel = document.getElementById('modal-compartilhar');
  const botao = document.getElementById('modal-compartilhar-botao');
  const opcoes = document.getElementById('modal-compartilhar-opcoes');
  if (!painel || !botao || !opcoes || typeof abrirEvento !== 'function') return;
  let atual = null;
  const abrirAnterior = abrirEvento;
  abrirEvento = function(evento) {
    abrirAnterior(evento);
    atual = evento;
    const status = evento.situacao || 'programada';
    const link = typeof evento.link === 'string' && /^https?:\/\//i.test(evento.link.trim()) ? evento.link.trim() : '';
    painel.hidden = !link || ['cancelada','adiada'].includes(status);
    opcoes.hidden = true;
    botao.setAttribute('aria-expanded','false');
  };
  botao.addEventListener('click', () => {
    opcoes.hidden = !opcoes.hidden;
    botao.setAttribute('aria-expanded', String(!opcoes.hidden));
  });
  function textoParaCompartilhar() {
    if (!atual) return '';
    const passado = atual.data < new Date().toLocaleDateString('en-CA', {timeZone:'America/Sao_Paulo'});
    const data = atual.data ? atual.data.split('-').reverse().join('/') : '';
    const hora = atual.hora ? String(atual.hora).slice(0,5) : '';
    const convite = passado ? 'Assista à gravação:' : 'Acompanhe a transmissão:';
    return `🎲 ${atual.titulo || 'Compromisso'}\n📅 ${data}${hora ? ' às '+hora : ''}${atual.canal ? '\n📺 '+atual.canal : ''}\n${convite}\n${atual.link}`;
  }
  opcoes.addEventListener('click', async evento => {
    const b = evento.target.closest('button[data-compartilhar]');
    if (!b || !atual) return;
    const texto = textoParaCompartilhar();
    const encoded = encodeURIComponent(texto);
    const urls = {
      x: 'https://twitter.com/intent/tweet?text='+encoded,
      bluesky: 'https://bsky.app/intent/compose?text='+encoded,
      threads: 'https://www.threads.net/intent/post?text='+encoded,
      whatsapp: 'https://api.whatsapp.com/send?text='+encoded
    };
    if (b.dataset.compartilhar === 'copiar') {
      try { await navigator.clipboard.writeText(texto); b.textContent='✓ Copiado'; setTimeout(()=>b.textContent='📋 Copiar texto',1800); }
      catch(e) { window.prompt('Copie o texto:', texto); }
    } else if (urls[b.dataset.compartilhar]) {
      window.open(urls[b.dataset.compartilhar], '_blank', 'noopener,noreferrer');
    }
  });
})();
