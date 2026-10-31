"use strict";
/* Módulo do media kit: depende de admin.js, Supabase e da tabela SQL fornecida. */
(() => {
  const el = id => document.getElementById(id);
  const form = el('mk-admin-form');
  if (!form) return;
  const msg = el('mk-admin-mensagem');
  const colunas = ['youtube_inscritos','youtube_visualizacoes','youtube_horas','youtube_periodo','youtube_publico','instagram_seguidores','instagram_reels_views','instagram_contas_alcancadas','instagram_periodo','instagram_publico','atualizado_em'];
  let carregado = false;
  async function autorizado(){
    const ok = await verificarAdministrador();
    if(!ok) throw new Error('Faça login como administradora para continuar.');
  }
  async function carregar(){
    if (carregado) return;
    msg.textContent='Carregando métricas...';
    try {
      await autorizado();
      const {data,error}=await supabaseClient.from('media_kit_metricas').select('*').eq('id',1).maybeSingle();
      if(error)throw error;
      if(data)for(const nome of colunas)if(el('mk-admin-'+nome))el('mk-admin-'+nome).value=data[nome]??'';
      carregado=true;msg.textContent=data?'Métricas carregadas.':'Nenhum registro ainda. Preencha e salve.';
    }catch(e){msg.textContent='Não foi possível carregar: '+e.message;}
  }
  document.querySelector('[data-aba="aba-media-kit"]')?.addEventListener('click',carregar);
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const botao=el('mk-admin-salvar');botao.disabled=true;msg.textContent='Salvando...';
    try{
      await autorizado();
      const valores={id:1};
      const numeros=new Set(['youtube_inscritos','youtube_visualizacoes','youtube_horas','instagram_seguidores','instagram_reels_views','instagram_contas_alcancadas']);
      for(const nome of colunas){
        const texto=el('mk-admin-'+nome).value.trim();
        valores[nome]=numeros.has(nome)?(texto===''?null:Number(texto)):(texto||null);
      }
      const {error}=await supabaseClient.from('media_kit_metricas').upsert(valores,{onConflict:'id'});
      if(error)throw error;
      msg.textContent='💜 Métricas salvas! Atualize a página pública para conferir. O PDF precisa ser regenerado separadamente.';
    }catch(err){msg.textContent='Erro ao salvar: '+err.message;}
    finally{botao.disabled=false;}
  });
  supabaseClient.auth.onAuthStateChange((evento)=>{if(evento==='SIGNED_OUT')carregado=false;});
})();
