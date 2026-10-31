"use strict";
// Módulo independente. Depende de admin.js e da tabela public.excecoes_disponibilidade.
(() => {
  const el = id => document.getElementById(id);
  const db = supabaseClient;
  let registros = [];
  let editando = null;
  let carregando = false;
  const nomes = {ferias:'🏖️ Férias',feriado:'📅 Feriado',folga:'🌿 Folga',recesso:'🏠 Recesso',outro:'✨ Outro'};
  const turnos = {manha:'Manhã',tarde:'Tarde',noite:'Noite'};
  const msg = texto => {el('excecao-mensagem').textContent = texto;};
  function limpar() {
    editando = null;
    el('excecao-form').reset();
    el('excecao-cancelar').hidden = true;
    el('excecao-salvar').textContent = '💾 Salvar exceção';
  }
  function dataBR(v) {return v ? v.split('-').reverse().join('/') : '';}
  function botao(texto, fn) {const b=document.createElement('button');b.type='button';b.textContent=texto;b.addEventListener('click',fn);return b;}
  function renderizar() {
    const lista=el('excecao-lista');lista.replaceChildren();
    if(!registros.length){const p=document.createElement('p');p.textContent='Nenhuma exceção cadastrada.';lista.append(p);return;}
    for(const r of registros){
      const item=document.createElement('article');item.className='admin-item';
      const titulo=document.createElement('h4');titulo.textContent=`${nomes[r.tipo]||r.tipo} · ${dataBR(r.data_inicio)} a ${dataBR(r.data_fim)}`;
      item.append(titulo);
      if(r.descricao){const d=document.createElement('p');d.textContent=r.descricao;item.append(d);}
      const t=document.createElement('p');t.textContent='Turnos liberados: '+(r.turnos||[]).map(x=>turnos[x]||x).join(', ');item.append(t);
      const a=document.createElement('div');a.className='admin-acoes';
      a.append(botao('✏️ Editar',()=>editar(r)),botao('🗑️ Excluir',()=>excluir(r)));
      item.append(a);lista.append(item);
    }
  }
  async function carregar(){
    if(carregando)return;
    carregando=true;
    try{
      if(!(await verificarAdministrador()))return;
      const {data,error}=await db.from('excecoes_disponibilidade').select('id,tipo,descricao,data_inicio,data_fim,turnos').order('data_inicio',{ascending:false});
      if(error)throw error;
      registros=data||[];renderizar();msg('');
    }catch(e){console.error('Exceções:',e);msg('⚠️ Não foi possível carregar as exceções. Verifique se o SQL foi executado no Supabase e se as políticas RLS estão ativas. '+e.message);}
    finally{carregando=false;}
  }
  function editar(r){
    editando=r.id;el('excecao-tipo').value=r.tipo;el('excecao-descricao').value=r.descricao||'';
    el('excecao-inicio').value=r.data_inicio;el('excecao-fim').value=r.data_fim;
    for(const t of Object.keys(turnos))el('excecao-'+t).checked=(r.turnos||[]).includes(t);
    el('excecao-cancelar').hidden=false;el('excecao-salvar').textContent='💾 Atualizar exceção';
    el('excecao-form').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function excluir(r){
    if(!confirm(`Excluir ${nomes[r.tipo]||r.tipo} de ${dataBR(r.data_inicio)} a ${dataBR(r.data_fim)}?`))return;
    try{if(!(await verificarAdministrador()))throw Error('Acesso não autorizado.');
      const {error}=await db.from('excecoes_disponibilidade').delete().eq('id',r.id);
      if(error)throw error;limpar();await carregar();msg('💜 Exceção excluída.');
    }catch(e){msg('Não foi possível excluir: '+e.message);}
  }
  el('excecao-cancelar').addEventListener('click',limpar);
  el('excecao-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const inicio=el('excecao-inicio').value,fim=el('excecao-fim').value;
    const selecionados=Object.keys(turnos).filter(t=>el('excecao-'+t).checked);
    if(!inicio||!fim||fim<inicio){msg('Confira as datas: a data final deve ser igual ou posterior à inicial.');return;}
    if(!selecionados.length){msg('Selecione pelo menos um turno.');return;}
    const bot=el('excecao-salvar');bot.disabled=true;msg('Salvando...');
    try{
      if(!(await verificarAdministrador()))throw Error('Acesso não autorizado.');
      const dados={tipo:el('excecao-tipo').value,descricao:el('excecao-descricao').value.trim(),data_inicio:inicio,data_fim:fim,turnos:selecionados};
      const q=db.from('excecoes_disponibilidade');
      const {error}=editando!==null?await q.update(dados).eq('id',editando):await q.insert([dados]);
      if(error)throw error;
      limpar();await carregar();msg('💜 Exceção salva com sucesso!');
    }catch(err){console.error(err);msg('Não foi possível salvar: '+err.message);}
    finally{bot.disabled=false;}
  });
  // Carrega quando o painel se torna visível, inclusive em sessões já autenticadas.
  const observer=new MutationObserver(()=>{if(!el('area-admin').hidden)carregar();});
  observer.observe(el('area-admin'),{attributes:true,attributeFilter:['hidden']});
  document.querySelector('[data-aba="aba-excecoes"]').addEventListener('click',carregar);
  if(!el('area-admin').hidden)carregar();
})();
