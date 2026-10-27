
"use strict";

// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://gevkvjuaurcxokudlblc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";

const ADMIN_UID =
  "5f0cd47a-7c6f-4fc5-99d8-449534c393e8";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const TURNOS = {
  manha: { inicio: "06:00", fim: "12:00" },
  tarde: { inicio: "12:00", fim: "18:00" },
  noite: { inicio: "18:00", fim: "00:00" }
};

const CATEGORIAS = {
  "rpg-proprio": "🎲 RPG no meu canal",
  "rpg-externo": "🧙 RPG em outros canais",
  podcast: "🎙️ Podcasts",
  jogos: "🎮 Jogos",
  video: "🎬 Vídeos",
  evento: "🎪 Evento externo",
  trabalho: "💼 Trabalho",
  ocupado: "🔴 Ocupado",
  livre: "🟢 Livre"
};

let campanhas = [];
let eventos = [];
let eventoEmEdicao = null;
let campanhaEmEdicao = null;
let datasRecorrencia = [];
let bancoPreparado = false;

// ==========================================
// ELEMENTOS E AUXILIARES
// ==========================================

function campo(id) {
  return document.getElementById(id);
}

function valor(id) {
  return campo(id).value.trim();
}

function mensagem(id, texto) {
  campo(id).textContent = texto;
}

function criarElemento(tag, texto, classe) {
  const elemento = document.createElement(tag);

  if (texto !== undefined) {
    elemento.textContent = texto;
  }

  if (classe) {
    elemento.className = classe;
  }

  return elemento;
}

function criarBotao(texto, acao, classe = "") {
  const botao = criarElemento("button", texto, classe);
  botao.type = "button";
  botao.addEventListener("click", acao);
  return botao;
}

function formatarData(data) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  return hora ? String(hora).slice(0, 5) : "";
}

function obterTurno(hora) {
  if (hora >= "06:00" && hora < "12:00") {
    return "manha";
  }

  if (hora >= "12:00" && hora < "18:00") {
    return "tarde";
  }

  return "noite";
}

function dataLocal(texto) {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function dataISO(data) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0")
  ].join("-");
}

function hojeISO() {
  return dataISO(new Date());
}

function adicionarDias(texto, quantidade) {
  const data = dataLocal(texto);
  data.setDate(data.getDate() + quantidade);
  return dataISO(data);
}

function adicionarMeses(texto, quantidade) {
  const original = dataLocal(texto);
  const diaOriginal = original.getDate();

  const destino = new Date(
    original.getFullYear(),
    original.getMonth() + quantidade,
    1
  );

  const ultimoDia = new Date(
    destino.getFullYear(),
    destino.getMonth() + 1,
    0
  ).getDate();

  destino.setDate(Math.min(diaOriginal, ultimoDia));
  return dataISO(destino);
}

function encontrarCampanha(id) {
  return campanhas.find(
    item => Number(item.id) === Number(id)
  );
}

function encontrarEvento(id) {
  return eventos.find(
    item => String(item.id) === String(id)
  );
}

function exigirBancoPreparado() {
  if (!bancoPreparado) {
    throw new Error(
      "A estrutura do Supabase não está disponível."
    );
  }
}

// ==========================================
// SNAPSHOT HISTÓRICO
// ==========================================

// Esta função registra os dados da campanha
// associados à sessão.
//
// O snapshot permite preservar as informações
// depois que a campanha for atualizada.

function criarSnapshotCampanha(campanha, dados = {}) {
  if (!campanha) return null;

  return {
    titulo: dados.titulo ?? campanha.titulo ?? "",
    categoria:
      dados.categoria ?? campanha.categoria ?? "",
    canal: dados.canal ?? campanha.canal ?? "",
    narrador:
      dados.narrador ?? campanha.narrador ?? "",
    sinopse:
      dados.sinopse ?? campanha.sinopse ?? "",
    imagem:
      dados.imagem ?? campanha.imagem ?? "",
    link: dados.link ?? campanha.link ?? ""
  };
}

// Quando uma sessão já tem um snapshot,
// ele não deve ser substituído por uma
// simples atualização do compromisso.

function snapshotParaEvento(
  campanha,
  dados,
  anterior = null
) {
  if (!campanha) return null;

  const mesmaCampanha =
    anterior &&
    Number(anterior.campanha_id) ===
      Number(campanha.id);

  if (
    mesmaCampanha &&
    anterior.campanha_snapshot
  ) {
    return anterior.campanha_snapshot;
  }

  return criarSnapshotCampanha(campanha, {
    titulo: dados.titulo,
    categoria: dados.categoria,
    canal: dados.canal ?? campanha.canal ?? "",
    narrador:
      dados.narrador ?? campanha.narrador ?? "",
    sinopse:
      dados.sinopse ?? campanha.sinopse ?? "",
    imagem:
      dados.imagem ?? campanha.imagem ?? "",
    link: dados.link || campanha.link || ""
  });
}

// ==========================================
// SEGURANÇA ADMINISTRATIVA
// ==========================================

async function verificarAdministrador() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  return !error && !!user && user.id === ADMIN_UID;
}

async function exigirAdministrador() {
  if (!(await verificarAdministrador())) {
    mostrarLogin();
    throw new Error(
      "Sessão administrativa não autorizada."
    );
  }
}

// As políticas RLS do Supabase continuam
// responsáveis pela proteção dos dados.

// ==========================================
// LOGIN E PAINEL
// ==========================================

function mostrarLogin() {
  campo("login-form").hidden = false;
  campo("area-admin").hidden = true;
}

function mostrarPainel() {
  campo("login-form").hidden = true;
  campo("area-admin").hidden = false;
}

function mostrarMensagemLogin(texto) {
  const elemento = campo("admin-mensagem");
  elemento.textContent = texto;
  elemento.hidden = !texto;
}

function abrirAba(id) {
  document
    .querySelectorAll(".admin-secao")
    .forEach(secao => {
      secao.hidden = secao.id !== id;
    });

  document
    .querySelectorAll(".admin-abas button[data-aba]")
    .forEach(botao => {
      const ativa = botao.dataset.aba === id;

      botao.classList.toggle("ativo", ativa);
      botao.setAttribute(
        "aria-selected",
        String(ativa)
      );
    });
}

document
  .querySelectorAll(".admin-abas button[data-aba]")
  .forEach(botao => {
    botao.addEventListener("click", () => {
      abrirAba(botao.dataset.aba);
    });
  });

async function verificarEstruturaBanco() {
  bancoPreparado = false;

  const respostaCampanhas = await supabaseClient
    .from("campanhas")
    .select("id")
    .limit(1);

  if (respostaCampanhas.error) {
    console.error(respostaCampanhas.error.message);
    return false;
  }

  const respostaEventos = await supabaseClient
    .from("eventos")
    .select(
      "id, campanha_id, turno, bloqueia_turno, " +
      "narrador, campanha_snapshot"
    )
    .limit(1);

  if (respostaEventos.error) {
    console.error(respostaEventos.error.message);
    return false;
  }

  bancoPreparado = true;
  return true;
}

function atualizarEstadoBanco() {
  const texto = bancoPreparado
    ? ""
    : "⚠️ Não foi possível verificar o Supabase.";

  [
    "evento-mensagem",
    "campanha-mensagem",
    "recorrencia-mensagem",
    "gerenciar-mensagem"
  ].forEach(id => mensagem(id, texto));

  [
    "salvar-evento",
    "salvar-campanha",
    "previsualizar-recorrencia",
    "salvar-recorrencia"
  ].forEach(id => {
    campo(id).disabled = !bancoPreparado;
  });
}

campo("login-form").addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    campo("entrar").disabled = true;
    mostrarMensagemLogin(
      "Verificando credenciais..."
    );

    try {
      const { error } =
        await supabaseClient.auth.signInWithPassword({
          email: valor("admin-email"),
          password: campo("admin-senha").value
        });

      if (error) throw error;

      campo("admin-senha").value = "";

      await exigirAdministrador();

      mostrarPainel();
      mostrarMensagemLogin(
        "Login realizado com sucesso! 💜"
      );

      await carregarPainel();

    } catch (erro) {
      mostrarLogin();

      mostrarMensagemLogin(
        "Não foi possível entrar ou a conta " +
        "não possui acesso."
      );

      console.error("Erro de login:", erro.message);

    } finally {
      campo("entrar").disabled = false;
    }
  }
);

// ==========================================
// CARREGAR CAMPANHAS
// ==========================================

async function carregarCampanhas() {
  await exigirAdministrador();
  exigirBancoPreparado();

  const { data, error } = await supabaseClient
    .from("campanhas")
    .select("*")
    .order("titulo");

  if (error) throw error;

  campanhas = data || [];

  preencherSeletoresCampanhas();
  renderizarCampanhas();
}

function preencherSeletoresCampanhas() {
  [
    "evento-campanha",
    "recorrencia-campanha"
  ].forEach(id => {
    const seletor = campo(id);
    const anterior = seletor.value;

    while (seletor.options.length > 1) {
      seletor.remove(1);
    }

    campanhas.forEach(campanha => {
      seletor.add(
        new Option(campanha.titulo, campanha.id)
      );
    });

    seletor.value = anterior;

    if (!seletor.value) {
      seletor.selectedIndex = 0;
    }
  });
}

function renderizarCampanhas() {
  const lista = campo("lista-campanhas");
  lista.replaceChildren();

  if (!campanhas.length) {
    lista.append(
      criarElemento(
        "p",
        "Nenhuma campanha cadastrada."
      )
    );
    return;
  }

  campanhas.forEach(campanha => {
    const item = criarElemento(
      "article",
      undefined,
      "admin-item"
    );

    item.append(
      criarElemento("h4", campanha.titulo),
      criarElemento(
        "p",
        CATEGORIAS[campanha.categoria] ||
          campanha.categoria
      )
    );

    if (campanha.narrador) {
      item.append(
        criarElemento(
          "p",
          `Narrador(a): ${campanha.narrador}`
        )
      );
    }

    const acoes = criarElemento(
      "div",
      undefined,
      "admin-acoes"
    );

    acoes.append(
      criarBotao(
        "✏️ Editar",
        () => editarCampanha(campanha.id)
      ),
      criarBotao(
        "🗑️ Excluir",
        () => excluirCampanha(campanha.id),
        "admin-perigo"
      )
    );

    item.append(acoes);
    lista.append(item);
  });
}

// ==========================================
// SALVAR CAMPANHA
// ==========================================


function atualizarSecaoPersonagem() {
  const papel = valor("campanha-papel");

  const mostrar =
    papel === "jogadora" ||
    papel === "ambos";

  campo("campanha-secao-personagem").hidden = !mostrar;
}

campo("campanha-papel").addEventListener(
  "change",
  atualizarSecaoPersonagem
);


function dadosFormularioCampanha() {
  const campanhaAtual = campanhaEmEdicao !== null
    ? encontrarCampanha(campanhaEmEdicao)
    : null;

  const detalhesAtuais = campanhaAtual?.detalhes || {};

  return {
    titulo: valor("campanha-titulo"),
    categoria: valor("campanha-categoria"),
    narrador: valor("campanha-narrador"),
    canal: valor("campanha-canal"),
    sinopse: valor("campanha-sinopse"),
    imagem: valor("campanha-imagem"),
    link: valor("campanha-link"),
    detalhes: {
      ...detalhesAtuais,
      papel: valor("campanha-papel")
    }
  };
}

campo("campanha-form").addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const botao = campo("salvar-campanha");
    botao.disabled = true;

    mensagem(
      "campanha-mensagem",
      "Salvando campanha..."
    );

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      const dados = dadosFormularioCampanha();

      let resposta;

      if (campanhaEmEdicao !== null) {
        resposta = await supabaseClient
          .from("campanhas")
          .update(dados)
          .eq("id", campanhaEmEdicao);
      } else {
        resposta = await supabaseClient
          .from("campanhas")
          .insert([dados]);
      }

      if (resposta.error) throw resposta.error;

      cancelarEdicaoCampanha();

      await carregarCampanhas();
      await carregarEventos();

      mensagem(
        "campanha-mensagem",
        "💜 Campanha salva com sucesso!"
      );

    } catch (erro) {
      mensagem(
        "campanha-mensagem",
        "Não foi possível salvar a campanha."
      );

      console.error(erro.message);

    } finally {
      botao.disabled = !bancoPreparado;
    }
  }
);

function editarCampanha(id) {
  const campanha = encontrarCampanha(id);
  if (!campanha) return;

  campanhaEmEdicao = id;

  [
    "titulo",
    "categoria",
    "narrador",
    "canal",
    "sinopse",
    "imagem",
    "link"
  ].forEach(chave => {
    campo(`campanha-${chave}`).value =
      campanha[chave] || "";
  });
  
  campo("campanha-papel").value =
    campanha.detalhes?.papel || "";
  atualizarSecaoPersonagem();

  campo("salvar-campanha").textContent =
    "💾 Atualizar campanha";

  campo("cancelar-edicao-campanha").hidden =
    false;

  abrirAba("aba-campanhas");

  campo("campanha-form").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelarEdicaoCampanha() {
  campanhaEmEdicao = null;
  campo("campanha-form").reset();
  atualizarSecaoPersonagem();

  campo("salvar-campanha").textContent =
    "💾 Salvar campanha";

  campo("cancelar-edicao-campanha").hidden =
    true;
}

campo("cancelar-edicao-campanha")
  .addEventListener(
    "click",
    cancelarEdicaoCampanha
  );

async function excluirCampanha(id) {
  const campanha = encontrarCampanha(id);
  if (!campanha) return;

  try {
    await exigirAdministrador();

    const { count, error } = await supabaseClient
      .from("eventos")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("campanha_id", id);

    if (error) throw error;

    if (count > 0) {
      alert(
        "Esta campanha possui sessões vinculadas. " +
        "Remova ou desvincule as sessões " +
        "antes de excluí-la."
      );
      return;
    }

    if (!confirm(
      `Excluir a campanha "${campanha.titulo}"?`
    )) {
      return;
    }

    const resposta = await supabaseClient
      .from("campanhas")
      .delete()
      .eq("id", id);

    if (resposta.error) throw resposta.error;

    await carregarCampanhas();

    mensagem(
      "campanha-mensagem",
      "Campanha excluída."
    );

  } catch (erro) {
    mensagem(
      "campanha-mensagem",
      "Não foi possível excluir a campanha."
    );

    console.error(erro.message);
  }
}

// ==========================================
// PREENCHIMENTO AUTOMÁTICO DA CAMPANHA
// ==========================================

function preencherDadosCampanha(campanha) {
  [
    "titulo",
    "categoria",
    "canal",
    "narrador",
    "sinopse",
    "imagem",
    "link"
  ].forEach(chave => {
    campo(`evento-${chave}`).value =
      campanha[chave] || "";
  });
}

campo("evento-campanha").addEventListener(
  "change",
  () => {
    const campanha = encontrarCampanha(
      valor("evento-campanha")
    );

    if (campanha) {
      preencherDadosCampanha(campanha);
    }
  }
);

// ==========================================
// DADOS DO COMPROMISSO
// ==========================================

function dadosFormularioEvento() {
  const campanhaId = valor("evento-campanha");

  const campanha = campanhaId
    ? encontrarCampanha(campanhaId)
    : null;

  if (campanhaId && !campanha) {
    throw new Error(
      "A campanha selecionada não existe."
    );
  }

  const hora = valor("evento-hora");
  const linkInformado = valor("evento-link");

  const dados = {
    titulo: valor("evento-titulo"),
    categoria: valor("evento-categoria"),
    data: valor("evento-data"),
    hora,
    turno:
      valor("evento-turno") || obterTurno(hora),
    bloqueia_turno:
      campo("evento-bloqueia-turno").checked,
    status: valor("evento-status"),
    campanha_id: campanha ? campanha.id : null,
    canal: valor("evento-canal") || null,
    narrador: valor("evento-narrador") || null,
    sinopse: valor("evento-sinopse") || null,
    imagem: valor("evento-imagem") || null,
    link:
      campanha &&
      linkInformado === (campanha.link || "")
        ? null
        : (linkInformado || null)
  };

  const anterior = eventoEmEdicao !== null
    ? encontrarEvento(eventoEmEdicao)
    : null;

  dados.campanha_snapshot = snapshotParaEvento(
    campanha,
    dados,
    anterior
  );

  return dados;
}

// ==========================================
// SALVAR COMPROMISSO
// ==========================================

campo("evento-form").addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const botao = campo("salvar-evento");
    botao.disabled = true;

    mensagem(
      "evento-mensagem",
      "Salvando compromisso..."
    );

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      const dados = dadosFormularioEvento();

      let resposta;

      if (eventoEmEdicao !== null) {
        resposta = await supabaseClient
          .from("eventos")
          .update(dados)
          .eq("id", eventoEmEdicao);
      } else {
        resposta = await supabaseClient
          .from("eventos")
          .insert([dados]);
      }

      if (resposta.error) throw resposta.error;

      cancelarEdicaoEvento();
      await carregarEventos();

      mensagem(
        "evento-mensagem",
        "💜 Compromisso salvo com sucesso!"
      );

    } catch (erro) {
      mensagem(
        "evento-mensagem",
        "Não foi possível salvar o compromisso: " +
          erro.message
      );

      console.error(erro.message);

    } finally {
      botao.disabled = !bancoPreparado;
    }
  }
);

// ==========================================
// EDITAR COMPROMISSO
// ==========================================

function editarEvento(id) {
  const evento = encontrarEvento(id);
  if (!evento) return;

  eventoEmEdicao = id;

  const campanha = evento.campanha_id
    ? encontrarCampanha(evento.campanha_id)
    : null;

  const passada = evento.data < hojeISO();

  const snapshot = evento.campanha_snapshot;

  function informacao(chave) {
    if (passada) {
      return (
        snapshot?.[chave] ??
        evento[chave] ??
        campanha?.[chave] ??
        ""
      );
    }

    return (
      campanha?.[chave] ||
      evento[chave] ||
      ""
    );
  }

  campo("evento-campanha").value =
    evento.campanha_id || "";

  campo("evento-titulo").value =
    evento.titulo || campanha?.titulo || "";

  campo("evento-categoria").value =
    evento.categoria || campanha?.categoria || "";

  campo("evento-data").value =
    evento.data || "";

  campo("evento-hora").value =
    formatarHora(evento.hora);

  campo("evento-turno").value =
    evento.turno || "";

  campo("evento-bloqueia-turno").checked =
    evento.bloqueia_turno !== false;

  [
    "canal",
    "narrador",
    "sinopse",
    "imagem"
  ].forEach(chave => {
    campo(`evento-${chave}`).value =
      informacao(chave);
  });

  campo("evento-link").value =
    evento.link ||
    (
      passada
        ? snapshot?.link
        : campanha?.link
    ) ||
    campanha?.link ||
    "";

  campo("evento-status").value =
    evento.status || "agendada";

  campo("salvar-evento").textContent =
    "💾 Atualizar compromisso";

  campo("cancelar-edicao-evento").hidden =
    false;

  abrirAba("aba-eventos");

  campo("evento-form").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelarEdicaoEvento() {
  eventoEmEdicao = null;
  campo("evento-form").reset();

  campo("salvar-evento").textContent =
    "💾 Salvar compromisso";

  campo("cancelar-edicao-evento").hidden =
    true;
}

campo("cancelar-edicao-evento")
  .addEventListener(
    "click",
    cancelarEdicaoEvento
  );

// ==========================================
// CARREGAR COMPROMISSOS
// ==========================================

async function carregarEventos() {
  await exigirAdministrador();
  exigirBancoPreparado();

  const { data, error } = await supabaseClient
    .from("eventos")
    .select("*")
    .order("data", { ascending: true })
    .order("hora", { ascending: true });

  if (error) throw error;

  eventos = data || [];
  renderizarEventos();
}

// ==========================================
// GERENCIAR COMPROMISSOS
// ==========================================

function renderizarEventos() {
  const lista = campo("lista-eventos");
  lista.replaceChildren();

  const filtro = valor("gerenciar-filtro");

  const filtrados = eventos.filter(evento => {
    return filtro === "todos" ||
      evento.status === filtro;
  });

  if (!filtrados.length) {
    lista.append(
      criarElemento(
        "p",
        "Nenhum compromisso encontrado."
      )
    );
    return;
  }

  filtrados.forEach(evento => {
    const campanha = evento.campanha_id
      ? encontrarCampanha(evento.campanha_id)
      : null;

    const titulo =
      evento.titulo ||
      campanha?.titulo ||
      "Sem título";

    const item = criarElemento(
      "article",
      undefined,
      "admin-item"
    );

    item.append(
      criarElemento("h4", titulo),
      criarElemento(
        "p",
        `${formatarData(evento.data)} • ` +
          formatarHora(evento.hora)
      ),
      criarElemento(
        "p",
        CATEGORIAS[evento.categoria] ||
          evento.categoria
      ),
      criarElemento(
        "p",
        evento.status === "publicada"
          ? "🟢 Publicado"
          : "📝 Rascunho"
      )
    );

    if (campanha) {
      item.append(
        criarElemento(
          "p",
          `Campanha: ${campanha.titulo}`
        )
      );
    }

    const acoes = criarElemento(
      "div",
      undefined,
      "admin-acoes"
    );

    acoes.append(
      criarBotao(
        "✏️ Editar",
        () => editarEvento(evento.id)
      ),
      criarBotao(
        evento.status === "publicada"
          ? "📥 Despublicar"
          : "📤 Publicar",
        () => alternarPublicacao(evento.id)
      ),
      criarBotao(
        "🗑️ Excluir",
        () => excluirEvento(evento.id),
        "admin-perigo"
      )
    );

    item.append(acoes);
    lista.append(item);
  });
}

campo("gerenciar-filtro").addEventListener(
  "change",
  renderizarEventos
);

campo("atualizar-eventos").addEventListener(
  "click",
  async () => {
    try {
      await carregarEventos();

      mensagem(
        "gerenciar-mensagem",
        "Lista atualizada."
      );

    } catch (erro) {
      mensagem(
        "gerenciar-mensagem",
        "Não foi possível atualizar a lista."
      );

      console.error(erro.message);
    }
  }
);

// ==========================================
// PUBLICAR OU DESPUBLICAR
// ==========================================

async function alternarPublicacao(id) {
  const evento = encontrarEvento(id);
  if (!evento) return;

  const novoStatus =
    evento.status === "publicada"
      ? "agendada"
      : "publicada";

  try {
    await exigirAdministrador();

    const { error } = await supabaseClient
      .from("eventos")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) throw error;

    await carregarEventos();

    mensagem(
      "gerenciar-mensagem",
      "Situação atualizada com sucesso!"
    );

  } catch (erro) {
    mensagem(
      "gerenciar-mensagem",
      "Não foi possível alterar a publicação."
    );

    console.error(erro.message);
  }
}

// ==========================================
// EXCLUIR COMPROMISSO
// ==========================================

async function excluirEvento(id) {
  const evento = encontrarEvento(id);
  if (!evento) return;

  if (!confirm(
    `Excluir o compromisso "${evento.titulo}"?`
  )) {
    return;
  }

  try {
    await exigirAdministrador();

    const { error } = await supabaseClient
      .from("eventos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await carregarEventos();

    mensagem(
      "gerenciar-mensagem",
      "Compromisso excluído."
    );

  } catch (erro) {
    mensagem(
      "gerenciar-mensagem",
      "Não foi possível excluir o compromisso."
    );

    console.error(erro.message);
  }
}

// ==========================================
// RECORRÊNCIA
// ==========================================

function gerarDatasRecorrencia() {
  const inicio = valor("recorrencia-inicio");

  const quantidade = Number(
    valor("recorrencia-quantidade")
  );

  const frequencia =
    valor("recorrencia-frequencia");

  if (
    !inicio ||
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > 52
  ) {
    throw new Error(
      "Informe uma data inicial e uma " +
      "quantidade entre 1 e 52."
    );
  }

  if (![
    "semanal",
    "quinzenal",
    "mensal"
  ].includes(frequencia)) {
    throw new Error(
      "Selecione uma frequência válida."
    );
  }

  const datas = [];

  for (
    let indice = 0;
    indice < quantidade;
    indice++
  ) {
    let data;

    if (frequencia === "semanal") {
      data = adicionarDias(
        inicio,
        indice * 7
      );

    } else if (frequencia === "quinzenal") {
      data = adicionarDias(
        inicio,
        indice * 14
      );

    } else {
      data = adicionarMeses(
        inicio,
        indice
      );
    }

    datas.push(data);
  }

  return datas;
}

function limparPreviaRecorrencia() {
  datasRecorrencia = [];

  campo("recorrencia-previa")
    .replaceChildren();

  campo("salvar-recorrencia").disabled = true;
}

[
  "recorrencia-campanha",
  "recorrencia-inicio",
  "recorrencia-hora",
  "recorrencia-frequencia",
  "recorrencia-quantidade",
  "recorrencia-turno",
  "recorrencia-status",
  "recorrencia-bloqueia-turno"
].forEach(id => {
  campo(id).addEventListener(
    "change",
    limparPreviaRecorrencia
  );
});

// ==========================================
// PRÉVIA DA RECORRÊNCIA
// ==========================================

campo("previsualizar-recorrencia")
  .addEventListener(
    "click",
    () => {
      try {
        exigirBancoPreparado();

        if (
          !campo("recorrencia-form")
            .reportValidity()
        ) {
          return;
        }

        datasRecorrencia =
          gerarDatasRecorrencia();

        const previa =
          campo("recorrencia-previa");

        previa.replaceChildren();

        datasRecorrencia.forEach(
          (data, indice) => {
            const item = criarElemento(
              "div",
              undefined,
              "admin-item"
            );

            item.append(
              criarElemento(
                "span",
                `Sessão ${indice + 1}: ` +
                  formatarData(data)
              ),
              criarBotao(
                "Remover",
                () => {
                  datasRecorrencia =
                    datasRecorrencia.filter(
                      valorData =>
                        valorData !== data
                    );

                  item.remove();

                  campo(
                    "salvar-recorrencia"
                  ).disabled =
                    !datasRecorrencia.length;
                }
              )
            );

            previa.append(item);
          }
        );

        campo("salvar-recorrencia").disabled =
          !datasRecorrencia.length;

        mensagem(
          "recorrencia-mensagem",
          `${datasRecorrencia.length} ` +
          "sessões prontas para revisão."
        );

      } catch (erro) {
        mensagem(
          "recorrencia-mensagem",
          erro.message
        );
      }
    }
  );

// ==========================================
// SALVAR RECORRÊNCIA
// ==========================================

campo("recorrencia-form").addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const botao =
      campo("salvar-recorrencia");

    botao.disabled = true;

    mensagem(
      "recorrencia-mensagem",
      "Salvando sessões..."
    );

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      const campanhaId = Number(
        valor("recorrencia-campanha")
      );

      const campanha =
        encontrarCampanha(campanhaId);

      if (!campanha) {
        throw new Error(
          "Selecione uma campanha válida."
        );
      }

      if (!datasRecorrencia.length) {
        throw new Error(
          "Confira as datas antes de salvar."
        );
      }

      const hora =
        valor("recorrencia-hora");

      const turno =
        valor("recorrencia-turno") ||
        obterTurno(hora);

      const snapshot =
        criarSnapshotCampanha(campanha);

      const registros =
        datasRecorrencia.map(data => ({
          campanha_id: campanhaId,
          titulo: campanha.titulo,
          categoria: campanha.categoria,
          data,
          hora,
          turno,
          bloqueia_turno:
            campo(
              "recorrencia-bloqueia-turno"
            ).checked,
          status:
            valor("recorrencia-status"),
          canal:
            campanha.canal || null,
          narrador:
            campanha.narrador || null,
          sinopse:
            campanha.sinopse || null,
          imagem:
            campanha.imagem || null,
          link: null,
          campanha_snapshot: snapshot
        }));

      // Verifica sessões já cadastradas
      // para evitar duplicatas.

      const {
        data: existentes,
        error: erroConsulta
      } = await supabaseClient
        .from("eventos")
        .select("data, hora")
        .eq("campanha_id", campanhaId);

      if (erroConsulta) {
        throw erroConsulta;
      }

      const duplicadas =
        registros.filter(registro => {
          return (existentes || []).some(
            item =>
              item.data === registro.data &&
              formatarHora(item.hora) ===
                formatarHora(registro.hora)
          );
        });

      if (duplicadas.length) {
        throw new Error(
          "Já existem sessões dessa campanha " +
          "em uma ou mais datas selecionadas."
        );
      }

      const { error } = await supabaseClient
        .from("eventos")
        .insert(registros);

      if (error) throw error;

      campo("recorrencia-form").reset();
      limparPreviaRecorrencia();

      await carregarEventos();

      mensagem(
        "recorrencia-mensagem",
        "💜 Sessões cadastradas com sucesso!"
      );

    } catch (erro) {
      mensagem(
        "recorrencia-mensagem",
        erro.message
      );

      console.error(
        "Erro na recorrência:",
        erro.message
      );

    } finally {
      botao.disabled =
        !bancoPreparado ||
        !datasRecorrencia.length;
    }
  }
);

// ==========================================
// CARREGAMENTO GERAL
// ==========================================

async function carregarPainel() {
  try {
    const preparado =
      await verificarEstruturaBanco();

    atualizarEstadoBanco();

    if (!preparado) {
      mostrarMensagemLogin(
        "Login realizado! 💜 " +
        "Não foi possível verificar a " +
        "estrutura do Supabase."
      );
      return;
    }

    await carregarCampanhas();
    await carregarEventos();

  } catch (erro) {
    console.error(
      "Erro ao carregar painel:",
      erro.message
    );

    mostrarMensagemLogin(
      "Não foi possível carregar todos " +
      "os dados do painel."
    );
  }
}

// ==========================================
// SAIR DA CONTA
// ==========================================

campo("sair").addEventListener(
  "click",
  async () => {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      mostrarMensagemLogin(
        "Não foi possível sair da conta."
      );
      return;
    }

    campanhas = [];
    eventos = [];
    bancoPreparado = false;

    cancelarEdicaoEvento();
    cancelarEdicaoCampanha();
    limparPreviaRecorrencia();

    mostrarLogin();

    mostrarMensagemLogin(
      "Você saiu da conta."
    );
  }
);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function iniciarPainel() {
  mostrarLogin();
  abrirAba("aba-eventos");

  try {
    const autorizado =
      await verificarAdministrador();

    if (autorizado) {
      mostrarPainel();

      mostrarMensagemLogin(
        "Sessão administrativa ativa. 💜"
      );

      await carregarPainel();
    }

  } catch (erro) {
    console.error(
      "Erro ao iniciar painel:",
      erro.message
    );
  }
}

iniciarPainel();


/* ==========================================
   GERENCIAR 2.0
   Filtros, busca e paginação
========================================== */

const ITENS_POR_PAGINA = 20;
const LOTE_CONSULTA = 500;

let paginaGerenciar = 1;

/* Carrega todos os compromissos em lotes,
   evitando o limite padrão de registros
   retornados pelo Supabase. */

async function carregarEventos() {
  await exigirAdministrador();
  exigirBancoPreparado();

  const todos = [];
  let inicio = 0;

  while (true) {
    const { data, error } = await supabaseClient
      .from("eventos")
      .select("*")
      .order("data", { ascending: true })
      .order("hora", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + LOTE_CONSULTA - 1);

    if (error) throw error;

    const lote = data || [];
    todos.push(...lote);

    if (lote.length < LOTE_CONSULTA) {
      break;
    }

    inicio += LOTE_CONSULTA;
  }

  eventos = todos;
  renderizarEventos();
}

/* Preenche o filtro de campanhas com
   as campanhas cadastradas no Supabase. */

function atualizarCampanhasGerenciar() {
  const seletor = campo("gerenciar-campanha");
  if (!seletor) return;

  const selecionada = seletor.value;

  seletor.replaceChildren(
    new Option("Todas as campanhas", "todas")
  );

  campanhas.forEach(campanha => {
    seletor.add(
      new Option(campanha.titulo, String(campanha.id))
    );
  });

  const existe = Array.from(seletor.options)
    .some(opcao => opcao.value === selecionada);

  seletor.value = existe ? selecionada : "todas";

  const categoria = valor("gerenciar-categoria");

  const categoriaRPG =
    categoria === "rpg-proprio" ||
    categoria === "rpg-externo";

  seletor.disabled = !categoriaRPG;

  if (!categoriaRPG) {
    seletor.value = "todas";
  }
}

/* Retorna os compromissos que correspondem
   a todos os filtros selecionados. */

function filtrarEventosGerenciar() {
  const status = valor("gerenciar-filtro");
  const categoria = valor("gerenciar-categoria");
  const periodo = valor("gerenciar-periodo");
  const campanhaId = valor("gerenciar-campanha");

  const busca = valor("gerenciar-busca")
    .toLocaleLowerCase("pt-BR");

  const hoje = hojeISO();

  return eventos.filter(evento => {
    const campanha = evento.campanha_id
      ? encontrarCampanha(evento.campanha_id)
      : null;

    const titulo = String(
      evento.titulo || campanha?.titulo || ""
    ).toLocaleLowerCase("pt-BR");

    const nomeCampanha = String(
      campanha?.titulo || ""
    ).toLocaleLowerCase("pt-BR");

    const categoriaEvento =
      evento.categoria || campanha?.categoria || "";

    if (
      status !== "todos" &&
      evento.status !== status
    ) {
      return false;
    }

    if (
      categoria !== "todos" &&
      categoriaEvento !== categoria
    ) {
      return false;
    }

    if (
      periodo === "futuros" &&
      evento.data < hoje
    ) {
      return false;
    }

    if (
      periodo === "passados" &&
      evento.data >= hoje
    ) {
      return false;
    }

    if (
      !campo("gerenciar-campanha").disabled &&
      campanhaId !== "todas" &&
      String(evento.campanha_id) !== campanhaId
    ) {
      return false;
    }

    if (
      busca &&
      !titulo.includes(busca) &&
      !nomeCampanha.includes(busca)
    ) {
      return false;
    }

    return true;
  });
}

/* Atualiza a lista exibida, mostrando
   somente 20 compromissos por página. */

function renderizarEventos() {
  atualizarCampanhasGerenciar();

  const lista = campo("lista-eventos");
  lista.replaceChildren();

  const filtrados = filtrarEventosGerenciar();

  const total = filtrados.length;
  const totalPaginas = Math.max(
    1,
    Math.ceil(total / ITENS_POR_PAGINA)
  );

  paginaGerenciar = Math.min(
    Math.max(1, paginaGerenciar),
    totalPaginas
  );

  const periodo = valor("gerenciar-periodo");

  const ordenados = [...filtrados].sort((a, b) => {
    const chaveA =
      `${a.data || ""} ${formatarHora(a.hora)}`;
    const chaveB =
      `${b.data || ""} ${formatarHora(b.hora)}`;

    const comparacao = chaveA.localeCompare(chaveB);

    return periodo === "passados"
      ? -comparacao
      : comparacao;
  });

  const inicio =
    (paginaGerenciar - 1) * ITENS_POR_PAGINA;

  const exibidos = ordenados.slice(
    inicio,
    inicio + ITENS_POR_PAGINA
  );

  const resumo = campo("gerenciar-resumo");

  if (total === 0) {
    resumo.textContent =
      "Nenhum compromisso corresponde aos filtros.";

    lista.append(
      criarElemento(
        "p",
        "Nenhum compromisso encontrado. " +
        "Experimente alterar ou limpar os filtros."
      )
    );
  } else {
    const primeiro = inicio + 1;
    const ultimo = Math.min(
      inicio + ITENS_POR_PAGINA,
      total
    );

    resumo.textContent =
      `Exibindo ${primeiro} a ${ultimo} ` +
      `de ${total} compromisso(s).`;
  }

  exibidos.forEach(evento => {
    const campanha = evento.campanha_id
      ? encontrarCampanha(evento.campanha_id)
      : null;

    const titulo =
      evento.titulo ||
      campanha?.titulo ||
      "Sem título";

    const item = criarElemento(
      "article",
      undefined,
      "admin-item"
    );

    item.append(
      criarElemento("h4", titulo),

      criarElemento(
        "p",
        `${formatarData(evento.data)} • ` +
        formatarHora(evento.hora)
      ),

      criarElemento(
        "p",
        CATEGORIAS[
          evento.categoria || campanha?.categoria
        ] || evento.categoria || "Sem categoria"
      ),

      criarElemento(
        "p",
        evento.status === "publicada"
          ? "🟢 Publicado"
          : "📝 Rascunho"
      )
    );

    if (campanha) {
      item.append(
        criarElemento(
          "p",
          `Campanha: ${campanha.titulo}`
        )
      );
    }

    const acoes = criarElemento(
      "div",
      undefined,
      "admin-acoes"
    );

    acoes.append(
      criarBotao(
        "✏️ Editar",
        () => editarEvento(evento.id)
      ),

      criarBotao(
        evento.status === "publicada"
          ? "📥 Despublicar"
          : "📤 Publicar",
        () => alternarPublicacao(evento.id)
      ),

      criarBotao(
        "🗑️ Excluir",
        () => excluirEvento(evento.id),
        "admin-perigo"
      )
    );

    item.append(acoes);
    lista.append(item);
  });

  const paginacao = campo("gerenciar-paginacao");

  paginacao.hidden = totalPaginas <= 1;

  campo("gerenciar-pagina-atual").textContent =
    `Página ${paginaGerenciar} de ${totalPaginas}`;

  campo("gerenciar-anterior").disabled =
    paginaGerenciar <= 1;

  campo("gerenciar-proxima").disabled =
    paginaGerenciar >= totalPaginas;
}

/* Reinicia a paginação sempre que
   um filtro for alterado. */

function filtrosGerenciarAlterados() {
  paginaGerenciar = 1;
  renderizarEventos();
}

[
  "gerenciar-categoria",
  "gerenciar-periodo",
  "gerenciar-campanha"
].forEach(id => {
  campo(id).addEventListener(
    "change",
    filtrosGerenciarAlterados
  );
});

/* O filtro de status já tem um evento
   no código original. Acrescentamos apenas
   o reinício da página. */

campo("gerenciar-filtro").addEventListener(
  "change",
  () => {
    paginaGerenciar = 1;
    renderizarEventos();
  }
);

/* Busca enquanto você digita. */

campo("gerenciar-busca").addEventListener(
  "input",
  filtrosGerenciarAlterados
);

/* Limpar filtros. */

campo("limpar-filtros").addEventListener(
  "click",
  () => {
    campo("gerenciar-filtro").value = "todos";
    campo("gerenciar-categoria").value = "todos";
    campo("gerenciar-periodo").value = "futuros";
    campo("gerenciar-campanha").value = "todas";
    campo("gerenciar-busca").value = "";

    paginaGerenciar = 1;

    renderizarEventos();

    mensagem(
      "gerenciar-mensagem",
      "Filtros limpos."
    );
  }
);

/* Navegação entre páginas. */

campo("gerenciar-anterior").addEventListener(
  "click",
  () => {
    if (paginaGerenciar > 1) {
      paginaGerenciar--;
      renderizarEventos();
    }
  }
);

campo("gerenciar-proxima").addEventListener(
  "click",
  () => {
    const total = filtrarEventosGerenciar().length;
    const totalPaginas = Math.max(
      1,
      Math.ceil(total / ITENS_POR_PAGINA)
    );

    if (paginaGerenciar < totalPaginas) {
      paginaGerenciar++;
      renderizarEventos();
    }
  }
);

/* Atualiza o filtro de campanhas quando
   a biblioteca for recarregada. */

const carregarCampanhasOriginal = carregarCampanhas;

carregarCampanhas = async function() {
  await carregarCampanhasOriginal();
  atualizarCampanhasGerenciar();
};
