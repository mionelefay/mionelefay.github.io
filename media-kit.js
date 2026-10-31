"use strict";
/* Estatísticas públicas: tabela public.media_kit_metricas com RLS de leitura. */
(() => {
  const SUPABASE_URL = 'https://gevkvjuaurcxokudlblc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd';
  const el = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString('pt-BR');
  async function carregar() {
    const status = el('mk-stats-status');
    if (!window.supabase) { status.textContent = 'Métricas temporariamente indisponíveis.'; return; }
    try {
      const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const {data, error} = await db.from('media_kit_metricas').select('*').eq('id',1).maybeSingle();
      if (error) throw error;
      if (!data) {status.textContent='As métricas serão publicadas em breve.';return;}
      const campos = {youtube_inscritos:'mk-yt-inscritos',youtube_visualizacoes:'mk-yt-views',youtube_horas:'mk-yt-horas',instagram_seguidores:'mk-ig-seguidores',instagram_reels_views:'mk-ig-views',instagram_contas_alcancadas:'mk-ig-alcance'};
      for (const [coluna,id] of Object.entries(campos)) if(data[coluna] != null) el(id).textContent=fmt(data[coluna]);
      el('mk-yt-periodo').textContent = data.youtube_periodo || 'Período não informado';
      el('mk-ig-periodo').textContent = data.instagram_periodo || 'Período não informado';
      el('mk-yt-publico').textContent = data.youtube_publico || 'Dados de audiência a atualizar.';
      el('mk-ig-publico').textContent = data.instagram_publico || 'Dados de seguidores a atualizar.';
      status.textContent = data.atualizado_em ? 'Última atualização: '+new Date(data.atualizado_em+'T12:00:00').toLocaleDateString('pt-BR') : 'Data da atualização não informada.';
    } catch (error) {
      console.error('Media kit: não foi possível consultar métricas',error);
      status.textContent='As métricas estão temporariamente indisponíveis. Solicite os dados atualizados por e-mail.';
    }
  }
  carregar();
})();
