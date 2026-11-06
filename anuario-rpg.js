/* ANUÁRIO DE RPG - Mione Le Fay | versão 2
   Fonte: Supabase (campanhas + eventos). Sem tabelas novas.
   Campos de classificação opcionais em campanhas.detalhes.tipo_aventura:
   "campanha" ou "one-shot". Registros sem tipo não são classificados por suposição.
*/
(() => {
  'use strict';
  const URL = 'https://gevkvjuaurcxokudlblc.supabase.co';
  const KEY = 'sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd';
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const css = `
    .ar-controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:16px 0}
    .ar-controls select,.ar-edit select{background:#291b3e;color:white;border:1px solid #a778c5;border-radius:8px;padding:9px}
    .ar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0 28px}
    .ar-card{background:#291b3e;border:1px solid #68458a;border-radius:12px;padding:18px}
    .ar-card strong{display:block;font-size:1.75rem;color:#eed0ff}
    .ar-card span{display:block;margin-top:6px;font-size:.9rem}
    .ar-section{margin:26px 0}.ar-section h3{color:#e8c7ff;margin:0 0 14px}
    .ar-list{display:grid;gap:9px}.ar-item{background:#291b3e;border:1px solid #68458a;border-radius:10px;padding:12px}
    .ar-item small{display:block;color:#dcc5ee;margin-top:4px}
    .ar-months{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:end;gap:4px;margin:16px 0}
    .ar-month{text-align:center;font-size:.7rem;min-width:0}.ar-bar{background:#ad78e7;border-radius:5px 5px 0 0;margin-bottom:5px}
    .ar-note{font-size:.85rem;opacity:.85;line-height:1.6}.ar-edit{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:9px}
    .ar-edit button{padding:9px 14px;background:#8d54b3;color:white;border:0;border-radius:8px;cursor:pointer}
    @media(max-width:550px){.ar-month{font-size:.55rem}.ar-months{gap:2px}}
  `;
  function el(tag, text, cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n; }
  function section(root,title){const s=el('section',undefined,'ar-section');s.append(el('h3',title));root.append(s);return s;}
  function normalize(v){return String(v||'').trim().toLocaleLowerCase('pt-BR');}
  function tipo(c){const v=normalize(c?.detalhes?.tipo_aventura);return ['campanha','one-shot'].includes(v)?v:'';}
  function papel(c){return normalize(c?.detalhes?.papel);}
  function sistema(c){return String(c?.detalhes?.universo?.sistema||'').trim();}
  function hojeISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function situacao(e){return normalize(e.situacao||'programada');}
  function rpg(e){return ['rpg-proprio','rpg-externo','rpg-offline'].includes(e.categoria);}
  function eventoValido(e){return rpg(e)&&e.data&&e.data<=hojeISO()&&!['cancelada','adiada'].includes(situacao(e));}
  async function all(client,table,cols,order){let items=[];for(let page=0;page<40;page++){
    let q=client.from(table).select(cols).range(page*1000,page*1000+999);
    if(order)q=q.order(order,{ascending:true});
    const {data,error}=await q;if(error)throw error;items.push(...(data||[]));if(!data||data.length<1000)break;
  }return items;}
  function dadosAno(campanhas,eventos,ano){
    const mapa=new Map(campanhas.map(c=>[String(c.id),c]));
    const vistos=new Set();
    const sessoes=eventos.filter(e=>{
      if(!eventoValido(e)||!String(e.data).startsWith(String(ano)))return false;
      const k=String(e.id);if(vistos.has(k))return false;vistos.add(k);return true;
    });
    const porCampanha=new Map();const avulsas=[];
    for(const e of sessoes){const c=mapa.get(String(e.campanha_id));if(!c){avulsas.push(e);continue;}
      if(!porCampanha.has(String(c.id)))porCampanha.set(String(c.id),{campanha:c,eventos:[]});
      porCampanha.get(String(c.id)).eventos.push(e);
    }
    const mesas=[...porCampanha.values()];
    const campanhasAtivas=mesas.filter(m=>tipo(m.campanha)==='campanha');
    const oneShots=mesas.filter(m=>tipo(m.campanha)==='one-shot');
    const indefinidas=mesas.filter(m=>!tipo(m.campanha));
    const meses=Array(12).fill(0);sessoes.forEach(e=>{const i=Number(e.data.slice(5,7))-1;if(i>=0&&i<12)meses[i]++;});
    const canal=(m)=>m.eventos.some(e=>e.categoria==='rpg-proprio')?'proprio':m.eventos.some(e=>e.categoria==='rpg-externo')?'externo':'offline';
    const sistemas=new Map();for(const m of mesas){const nome=sistema(m.campanha);if(!nome)continue;
      const key=normalize(nome);if(!sistemas.has(key))sistemas.set(key,{nome,campanhas:0,oneShots:0,sessoes:0,semTipo:0});
      const v=sistemas.get(key);if(tipo(m.campanha)==='campanha')v.campanhas++;else if(tipo(m.campanha)==='one-shot')v.oneShots++;else v.semTipo++;
      v.sessoes+=m.eventos.length;
    }
    return {sessoes,mesas,campanhasAtivas,oneShots,indefinidas,avulsas,meses,sistemas:[...sistemas.values()].sort((a,b)=>b.campanhas+b.oneShots-a.campanhas-a.oneShots),canal};
  }
  function cards(root,items){const wrap=el('div',undefined,'ar-grid');for(const [label,value] of items){const c=el('div',undefined,'ar-card');c.append(el('strong',value),el('span',label));wrap.append(c);}root.append(wrap);}
  function lista(root,items,render){const wrap=el('div',undefined,'ar-list');if(!items.length)wrap.append(el('p','Nenhum registro nessa categoria.'));for(const x of items){const item=el('div',undefined,'ar-item');render(item,x);wrap.append(item);}root.append(wrap);}
  function montar(root,campanhas,eventos,ano,admin,client){
    const d=dadosAno(campanhas,eventos,ano);root.replaceChildren();
    const anos=[...new Set(eventos.filter(e=>e.data&&rpg(e)).map(e=>Number(e.data.slice(0,4))))].filter(Number.isInteger);
    anos.push(new Date().getFullYear());const anosOrdenados=[...new Set(anos)].sort((a,b)=>b-a);
    const control=el('div',undefined,'ar-controls');const label=el('label','Ano: ');const select=el('select');select.setAttribute('aria-label','Ano do anuário');
    for(const a of anosOrdenados){const o=el('option',a);o.value=a;o.selected=a===ano;select.append(o);}label.append(select);control.append(label);root.append(control);
    select.addEventListener('change',()=>montar(root,campanhas,eventos,Number(select.value),admin,client));
    cards(root,[['Mesas de RPG diferentes',d.mesas.length],['Campanhas classificadas',d.campanhasAtivas.length],['One-shots classificados',d.oneShots.length],['Sessões registradas',d.sessoes.length],['Sistemas diferentes',d.sistemas.length],['Mesas sem tipo',d.indefinidas.length]]);
    const c=d.campanhasAtivas, os=d.oneShots;
    const count=(ms,canal,role)=>ms.filter(m=>(!canal||d.canal(m)===canal)&&(!role||papel(m.campanha)===role)).length;
    const part=section(root,'Minha participação');
    cards(part,[['Campanhas como jogadora no meu canal',count(c,'proprio','jogadora')],['Campanhas como narradora no meu canal',count(c,'proprio','narradora')],['Campanhas como jogadora em outros canais',count(c,'externo','jogadora')],['Campanhas como narradora em outros canais',count(c,'externo','narradora')],['Campanhas offline como jogadora',count(c,'offline','jogadora')],['Campanhas offline como narradora',count(c,'offline','narradora')],['One-shots como jogadora',count(os,null,'jogadora')],['One-shots como narradora',count(os,null,'narradora')]]);
    const can=section(root,'Onde as aventuras aconteceram');
    cards(can,[['Campanhas no meu canal',count(c,'proprio')],['Campanhas em outros canais',count(c,'externo')],['One-shots no meu canal',count(os,'proprio')],['One-shots em outros canais',count(os,'externo')],['Campanhas offline',count(c,'offline')],['One-shots offline',count(os,'offline')],['Sessões offline',d.sessoes.filter(e=>e.categoria==='rpg-offline').length],['Sessões no meu canal',d.sessoes.filter(e=>e.categoria==='rpg-proprio').length],['Sessões em outros canais',d.sessoes.filter(e=>e.categoria==='rpg-externo').length]]);
    const sys=section(root,'Sistemas explorados');
    lista(sys,d.sistemas,(item,s)=>{item.append(el('strong',s.nome),el('small',`${s.campanhas} campanha(s) • ${s.oneShots} one-shot(s) • ${s.sessoes} sessão(ões)${s.semTipo?' • '+s.semTipo+' mesa(s) sem tipo':''}`));});
    const month=section(root,'Sessões registradas por mês');const bars=el('div',undefined,'ar-months');const max=Math.max(1,...d.meses);
    d.meses.forEach((v,i)=>{const col=el('div',undefined,'ar-month');const bar=el('div',undefined,'ar-bar');bar.style.height=`${Math.max(3,Math.round(85*v/max))}px`;bar.title=`${MESES[i]}: ${v} sessões`;col.append(bar,el('span',MESES[i]),el('div',v));bars.append(col);});month.append(bars);
    const mesasSec=section(root,'Mesas do ano');
    lista(mesasSec,d.mesas.sort((a,b)=>a.campanha.titulo.localeCompare(b.campanha.titulo,'pt-BR')),(item,m)=>{
      const cp=m.campanha;const nome=cp.titulo||'Sem título';item.append(el('strong',nome),el('small',`${tipo(cp)==='one-shot'?'One-shot':tipo(cp)==='campanha'?'Campanha':'Tipo não informado'} • ${sistema(cp)||'Sistema não informado'} • ${m.eventos.length} sessão(ões) • ${d.canal(m)==='proprio'?'Meu canal':d.canal(m)==='offline'?'Offline':'Outros canais'} • ${papel(cp)||'Papel não informado'}`));
    });
    root.append(el('p','Uma mesa aparece em cada ano em que teve ao menos uma sessão válida até a data atual. Cada mesa conta uma vez por ano, mesmo com várias sessões. Eventos cancelados e adiados não entram; remarcações entram na nova data. Sessões passadas são registros da agenda, não confirmação independente de realização.','ar-note'));
    if(!admin)return;
    const pend=section(root,'Conferência administrativa de classificações');
    const incomplete=d.mesas.filter(m=>!tipo(m.campanha)||!sistema(m.campanha)||!['jogadora','narradora'].includes(papel(m.campanha)));
    pend.append(el('p',`${incomplete.length} mesa(s) com dados faltantes. Classifique o tipo abaixo; sistema e papel são editados no cadastro da campanha.`));
    lista(pend,incomplete,(item,m)=>{
      const cp=m.campanha;item.append(el('strong',cp.titulo||'Sem título'),el('small',[!tipo(cp)?'tipo não informado':null,!sistema(cp)?'sistema não informado':null,!['jogadora','narradora'].includes(papel(cp))?'papel não informado':null].filter(Boolean).join(' • ')));
      if(tipo(cp))return;
      const line=el('div',undefined,'ar-edit');const sel=el('select');sel.setAttribute('aria-label',`Tipo de ${cp.titulo}`);
      [['','Selecione o tipo'],['campanha','Campanha'],['one-shot','One-shot']].forEach(([v,t])=>{const o=el('option',t);o.value=v;sel.append(o);});
      const btn=el('button','Salvar tipo');const status=el('span');
      btn.addEventListener('click',async()=>{if(!sel.value)return;btn.disabled=true;status.textContent='Salvando...';
        try{const {data:{user}}=await client.auth.getUser();if(!user)throw new Error('Faça login no painel.');
          const novos={...(cp.detalhes||{}),tipo_aventura:sel.value};
          const {error}=await client.from('campanhas').update({detalhes:novos}).eq('id',cp.id);if(error)throw error;
          cp.detalhes=novos;montar(root,campanhas,eventos,ano,admin,client);
        }catch(err){status.textContent=`Erro: ${err.message}`;btn.disabled=false;}
      });line.append(sel,btn,status);item.append(line);
    });
    if(d.avulsas.length){const sem=section(root,'Sessões sem vínculo com campanha');sem.append(el('p',`${d.avulsas.length} evento(s) de RPG sem campanha vinculada. Eles entram no total de sessões, mas não no total de mesas, sistemas ou papéis.`));}
  }
  async function init(){const publico=document.getElementById('anuario-rpg-publico');const admin=document.getElementById('anuario-rpg-admin');if(!publico&&!admin)return;
    const st=el('style');st.textContent=css;document.head.append(st);
    const client=admin&&typeof supabaseClient!=='undefined'?supabaseClient:window.supabase?.createClient(URL,KEY);
    if(!client){(publico||admin).textContent='Não foi possível iniciar o anuário.';return;}
    try{const [campanhas,eventos]=await Promise.all([
      all(client,'campanhas','id,titulo,categoria,detalhes','id'),
      all(client,'eventos','id,titulo,categoria,data,campanha_id,situacao,evento_original_id,evento_remarcado_id,status','data')
    ]);
      const publicados=eventos.filter(e=>e.status==='publicada');const ano=new Date().getFullYear();
      if(publico)montar(publico,campanhas,publicados,ano,false,client);
      if(admin)montar(admin,campanhas,publicados,ano,true,client);
    }catch(e){console.error('Anuário RPG:',e);const msg='Não foi possível carregar o anuário: '+(e?.message||String(e));if(publico)publico.textContent=msg;if(admin)admin.textContent=msg;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
