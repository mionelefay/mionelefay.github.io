
"use strict";

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const SUPABASE_URL = "https://gevkvjuaurcxokudlblc.supabase.co";
const SUPABASE_KEY = "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";
const ADMIN_UID = "5f0cd47a-7c6f-4fc5-99d8-449534c393e8";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// CATEGORIAS E TURNOS
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

// ==========================================
// ELEMENTOS E ESTADO
// ==========================================

function campo(id) {
  return document.getElementById(id);
}

function valor(id) {
  return campo(id).value.trim();
}

const formulario = campo("login-form");
const campoEmail = campo("admin-email");
const campoSenha = campo("admin-senha");
const botaoEntrar = campo("entrar");
const mensagem = campo("admin-mensagem");
const areaAdmin = campo("area-admin");
const botaoSair = campo("sair");

const formularioEvento = campo("evento-form");
const botaoSalvarEvento = campo("salvar-evento");
const mensagemEvento = campo("evento-mensagem");

const formularioCampanha = campo("campanha-form");
const mensagemCampanha = campo("campanha-mensagem");
const listaCampanhas = campo("lista-campanhas");

const formularioRecorrencia = campo("recorrencia-form");
const mensagemRecorrencia = campo("recorrencia-mensagem");

const mensagemGerenciar = campo("gerenciar-mensagem");
const listaEventos = campo("lista-eventos");

let campanhas = [];
let eventos = [];
let eventoEmEdicao = null;
let campanhaEmEdicao = null;
let datasRecorrencia = [];
let bancoPreparado = false;

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
  mensagem.hidden = !texto;
}

function mostrarLogin() {
  formulario.hidden = false;
  areaAdmin.hidden = true;
}

function mostrarPainel() {
  formulario.hidden = true;
  areaAdmin.hidden = false;
}

function formatarData(data) {
  if (!data) return "";
  const partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHora(hora) {
  return hora ? hora.slice(0, 5) : "";
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

function dataLocal(dataTexto) {
  const [ano, mes, dia] = dataTexto.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function dataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function hojeISO() {
  return dataISO(new Date());
}

function adicionarDias(dataTexto, dias) {
  const data = dataLocal(dataTexto);
  data.setDate(data.getDate() + dias);
  return dataISO(data);
}

function adicionarMeses(dataTexto, meses) {
  const original = dataLocal(dataTexto);
  const diaOriginal = original.getDate();

  const destino = new Date(
    original.getFullYear(),
    original.getMonth() + meses,
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

function limparElemento(elemento) {
  elemento.replaceChildren();
}

function encontrarCampanha(id) {
  return campanhas.find(
    campanha => campanha.id === Number(id)
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
  const autorizado = await verificarAdministrador();

  if (!autorizado) {
    mostrarLogin();
    throw new Error("Sessão administrativa não autorizada.");
  }
}

// A proteção real dos dados é feita pelas
// políticas RLS configuradas no Supabase.

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================

function abrirAba(id) {
  document.querySelectorAll(".admin-secao").forEach(
    secao => {
      secao.hidden = secao.id !== id;
    }
  );

  document.querySelectorAll(
    ".admin-abas button[data-aba]"
  ).forEach(botao => {
    const ativa = botao.dataset.aba === id;

    botao.classList.toggle("ativo", ativa);
    botao.setAttribute("aria-selected", String(ativa));
  });
}

document.querySelectorAll(
  ".admin-abas button[data-aba]"
).forEach(botao => {
  botao.addEventListener("click", () => {
    abrirAba(botao.dataset.aba);
  });
});

// ==========================================
// VERIFICAÇÃO DO BANCO
// ==========================================

async function verificarEstruturaBanco() {
  bancoPreparado = false;

  const consultaCampanhas = await supabaseClient
    .from("campanhas")
    .select("id")
    .limit(1);

  if (consultaCampanhas.error) {
    console.error(consultaCampanhas.error.message);
    return false;
  }

  const consultaEventos = await supabaseClient
    .from("eventos")
    .select(
      "id, campanha_id, turno, bloqueia_turno, narrador"
    )
    .limit(1);

  if (consultaEventos.error) {
    console.error(consultaEventos.error.message);
    return false;
  }

  bancoPreparado = true;
  return true;
}

function atualizarEstadoBanco() {
  const texto = bancoPreparado
    ? ""
    : "⚠️ Não foi possível verificar o Supabase.";

  mensagemEvento.textContent = texto;
  mensagemCampanha.textContent = texto;
  mensagemRecorrencia.textContent = texto;
  mensagemGerenciar.textContent = texto;

  [
    botaoSalvarEvento,
    campo("salvar-campanha"),
    campo("previsualizar-recorrencia"),
    campo("salvar-recorrencia")
  ].forEach(botao => {
    botao.disabled = !bancoPreparado;
  });
}

// ==========================================
// LOGIN
// ==========================================

formulario.addEventListener("submit", async evento => {
  evento.preventDefault();

  botaoEntrar.disabled = true;
  mostrarMensagem("Verificando credenciais...");

  try {
    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email: campoEmail.value.trim(),
        password: campoSenha.value
      });

    if (error) throw error;

    campoSenha.value = "";

    await exigirAdministrador();

    mostrarPainel();
    mostrarMensagem("Login realizado com sucesso! 💜");

    await carregarPainel();

  } catch (erro) {
    mostrarLogin();

    mostrarMensagem(
      "Não foi possível entrar ou a conta não possui acesso."
    );

    console.error("Erro de login:", erro.message);

  } finally {
    botaoEntrar.disabled = false;
  }
});

// ==========================================
// CARREGAMENTO DAS CAMPANHAS
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
  const seletores = [
    campo("evento-campanha"),
    campo("recorrencia-campanha")
  ];

  seletores.forEach(seletor => {
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
  limparElemento(listaCampanhas);

  if (!campanhas.length) {
    listaCampanhas.append(
      criarElemento("p", "Nenhuma campanha cadastrada.")
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
    listaCampanhas.append(item);
  });
}

// ==========================================
// CADASTRO E EDIÇÃO DE CAMPANHAS
// ==========================================

function dadosFormularioCampanha() {
  return {
    titulo: valor("campanha-titulo"),
    categoria: valor("campanha-categoria"),
    narrador: valor("campanha-narrador"),
    canal: valor("campanha-canal"),
    sinopse: valor("campanha-sinopse"),
    imagem: valor("campanha-imagem"),
    link: valor("campanha-link")
  };
}

formularioCampanha.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const botao = campo("salvar-campanha");
    botao.disabled = true;

    mensagemCampanha.textContent = "Salvando campanha...";

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      const dados = dadosFormularioCampanha();

      let consulta;

      if (campanhaEmEdicao !== null) {
        consulta = await supabaseClient
          .from("campanhas")
          .update(dados)
          .eq("id", campanhaEmEdicao);
      } else {
        consulta = await supabaseClient
          .from("campanhas")
          .insert([dados]);
      }

      if (consulta.error) throw consulta.error;

      cancelarEdicaoCampanha();

      await carregarCampanhas();
      await carregarEventos();

      mensagemCampanha.textContent =
        "💜 Campanha salva com sucesso!";

    } catch (erro) {
      mensagemCampanha.textContent =
        "Não foi possível salvar a campanha.";

      console.error(
        "Erro ao salvar campanha:",
        erro.message
      );

    } finally {
      botao.disabled = !bancoPreparado;
    }
  }
);

function editarCampanha(id) {
  const campanha = encontrarCampanha(id);

  if (!campanha) return;

  campanhaEmEdicao = id;

  campo("campanha-titulo").value =
    campanha.titulo || "";

  campo("campanha-categoria").value =
    campanha.categoria || "";

  campo("campanha-narrador").value =
    campanha.narrador || "";

  campo("campanha-canal").value =
    campanha.canal || "";

  campo("campanha-sinopse").value =
    campanha.sinopse || "";

  campo("campanha-imagem").value =
    campanha.imagem || "";

  campo("campanha-link").value =
    campanha.link || "";

  campo("salvar-campanha").textContent =
    "💾 Atualizar campanha";

  campo("cancelar-edicao-campanha").hidden = false;

  abrirAba("aba-campanhas");

  formularioCampanha.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelarEdicaoCampanha() {
  campanhaEmEdicao = null;
  formularioCampanha.reset();

  campo("salvar-campanha").textContent =
    "💾 Salvar campanha";

  campo("cancelar-edicao-campanha").hidden = true;
}

campo("cancelar-edicao-campanha").addEventListener(
  "click",
  cancelarEdicaoCampanha
);

async function excluirCampanha(id) {
  const campanha = encontrarCampanha(id);

  if (!campanha) return;

  // A verificação definitiva também é feita
  // pela chave estrangeira no Supabase.
  const { count, error: erroConsulta } =
    await supabaseClient
      .from("eventos")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("campanha_id", id);

  if (erroConsulta) {
    mensagemCampanha.textContent =
      "Não foi possível verificar as sessões vinculadas.";
    return;
  }

  if (count > 0) {
    alert(
      "Esta campanha possui sessões vinculadas. " +
      "Remova ou desvincule as sessões antes de excluí-la."
    );
    return;
  }

  if (!confirm(
    `Excluir a campanha "${campanha.titulo}"?`
  )) {
    return;
  }

  try {
    await exigirAdministrador();

    const { error } = await supabaseClient
      .from("campanhas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await carregarCampanhas();

    mensagemCampanha.textContent =
      "Campanha excluída.";

  } catch (erro) {
    mensagemCampanha.textContent =
      "Não foi possível excluir a campanha.";

    console.error(erro.message);
  }
}

// ==========================================
// PREENCHIMENTO AUTOMÁTICO
// ==========================================

function preencherDadosCampanha(campanha) {
  campo("evento-titulo").value =
    campanha.titulo || "";

  campo("evento-categoria").value =
    campanha.categoria || "";

  campo("evento-canal").value =
    campanha.canal || "";

  campo("evento-narrador").value =
    campanha.narrador || "";

  campo("evento-sinopse").value =
    campanha.sinopse || "";

  campo("evento-imagem").value =
    campanha.imagem || "";

  campo("evento-link").value =
    campanha.link || "";
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
    throw new Error("A campanha selecionada não existe.");
  }

  const hora = valor("evento-hora");
  const data = valor("evento-data");

  const titulo = valor("evento-titulo");
  const linkInformado = valor("evento-link");

  const dados = {
    titulo,
    categoria: valor("evento-categoria"),
    data,
    hora,
    turno:
      valor("evento-turno") || obterTurno(hora),
    bloqueia_turno:
      campo("evento-bloqueia-turno").checked,
    status: valor("evento-status"),
    campanha_id: campanha ? campanha.id : null,

    // Guardamos uma cópia dos dados no evento.
    // Isso permite preservar informações
    // históricas das sessões anteriores.
    canal: valor("evento-canal") || null,
    narrador: valor("evento-narrador") || null,
    sinopse: valor("evento-sinopse") || null,
    imagem: valor("evento-imagem") || null,

    // Se o link for igual ao da campanha,
    // usamos null para permitir que o link
    // principal seja atualizado futuramente.
    //
    // Se for diferente, guardamos o link
    // exclusivo desta sessão.
    link: campanha &&
      linkInformado === (campanha.link || "")
        ? null
        : (linkInformado || null)
  };

  return dados;
}

// ==========================================
// SALVAR COMPROMISSO
// ==========================================

formularioEvento.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    botaoSalvarEvento.disabled = true;
    mensagemEvento.textContent =
      "Salvando compromisso...";

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      const dados = dadosFormularioEvento();

      let consulta;

      if (eventoEmEdicao !== null) {
        consulta = await supabaseClient
          .from("eventos")
          .update(dados)
          .eq("id", eventoEmEdicao);
      } else {
        consulta = await supabaseClient
          .from("eventos")
          .insert([dados]);
      }

      if (consulta.error) throw consulta.error;

      cancelarEdicaoEvento();

      await carregarEventos();

      mensagemEvento.textContent =
        "💜 Compromisso salvo com sucesso!";

    } catch (erro) {
      mensagemEvento.textContent =
        "Não foi possível salvar o compromisso: " +
        erro.message;

      console.error(
        "Erro ao salvar compromisso:",
        erro.message
      );

    } finally {
      botaoSalvarEvento.disabled = !bancoPreparado;
    }
  }
);

// ==========================================
// EDIÇÃO DE COMPROMISSOS
// ==========================================

function editarEvento(id) {
  const evento = eventos.find(
    item => item.id === id
  );

  if (!evento) return;

  eventoEmEdicao = id;

  const campanha = evento.campanha_id
    ? encontrarCampanha(evento.campanha_id)
    : null;

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

  // Sessões passadas mostram seus dados
  // registrados. Sessões futuras podem
  // aproveitar os dados atuais da campanha.
  const passada = evento.data < hojeISO();

  function informacao(chave) {
    if (passada) {
      return evento[chave] || campanha?.[chave] || "";
    }

    return campanha?.[chave] || evento[chave] || "";
  }

  campo("evento-canal").value =
    informacao("canal");

  campo("evento-narrador").value =
    informacao("narrador");

  campo("evento-sinopse").value =
    informacao("sinopse");

  campo("evento-imagem").value =
    informacao("imagem");

  // O link exclusivo tem prioridade.
  campo("evento-link").value =
    evento.link || campanha?.link || "";

  campo("evento-status").value =
    evento.status || "agendada";

  campo("salvar-evento").textContent =
    "💾 Atualizar compromisso";

  campo("cancelar-edicao-evento").hidden = false;

  abrirAba("aba-eventos");

  formularioEvento.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelarEdicaoEvento() {
  eventoEmEdicao = null;
  formularioEvento.reset();

  campo("salvar-evento").textContent =
    "💾 Salvar compromisso";

  campo("cancelar-edicao-evento").hidden = true;
}

campo("cancelar-edicao-evento").addEventListener(
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
// LISTAGEM E GERENCIAMENTO
// ==========================================

function renderizarEventos() {
  limparElemento(listaEventos);

  const filtro = valor("gerenciar-filtro");

  const filtrados = eventos.filter(evento => {
    return filtro === "todos" ||
      evento.status === filtro;
  });

  if (!filtrados.length) {
    listaEventos.append(
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
    listaEventos.append(item);
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
      mensagemGerenciar.textContent =
        "Lista atualizada.";

    } catch (erro) {
      mensagemGerenciar.textContent =
        "Não foi possível atualizar a lista.";

      console.error(erro.message);
    }
  }
);

// ==========================================
// PUBLICAR OU DESPUBLICAR
// ==========================================

async function alternarPublicacao(id) {
  const evento = eventos.find(
    item => item.id === id
  );

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

    mensagemGerenciar.textContent =
      "Situação atualizada com sucesso!";

  } catch (erro) {
    mensagemGerenciar.textContent =
      "Não foi possível alterar a publicação.";

    console.error(erro.message);
  }
}

// ==========================================
// EXCLUIR COMPROMISSO
// ==========================================

async function excluirEvento(id) {
  const evento = eventos.find(
    item => item.id === id
  );

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

    mensagemGerenciar.textContent =
      "Compromisso excluído.";

  } catch (erro) {
    mensagemGerenciar.textContent =
      "Não foi possível excluir o compromisso.";

    console.error(erro.message);
  }
}

// ==========================================
// GERAR DATAS RECORRENTES
// ==========================================

function gerarDatasRecorrencia() {
  const inicio = valor("recorrencia-inicio");
  const quantidade = Number(
    valor("recorrencia-quantidade")
  );

  const frequencia = valor("recorrencia-frequencia");

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
    throw new Error("Selecione uma frequência válida.");
  }

  const datas = [];

  for (
    let indice = 0;
    indice < quantidade;
    indice++
  ) {
    let data;

    if (frequencia === "semanal") {
      data = adicionarDias(inicio, indice * 7);

    } else if (frequencia === "quinzenal") {
      data = adicionarDias(inicio, indice * 14);

    } else {
      data = adicionarMeses(inicio, indice);
    }

    datas.push(data);
  }

  return datas;
}

// ==========================================
// PRÉVIA DA RECORRÊNCIA
// ==========================================

function limparPreviaRecorrencia() {
  datasRecorrencia = [];

  limparElemento(
    campo("recorrencia-previa")
  );

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

campo("previsualizar-recorrencia").addEventListener(
  "click",
  () => {
    try {
      exigirBancoPreparado();

      if (!formularioRecorrencia.reportValidity()) {
        return;
      }

      datasRecorrencia = gerarDatasRecorrencia();

      const previa = campo("recorrencia-previa");
      limparElemento(previa);

      datasRecorrencia.forEach((data, indice) => {
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
                  valorData => valorData !== data
                );

              item.remove();

              campo("salvar-recorrencia").disabled =
                !datasRecorrencia.length;
            }
          )
        );

        previa.append(item);
      });

      campo("salvar-recorrencia").disabled =
        !datasRecorrencia.length;

      mensagemRecorrencia.textContent =
        `${datasRecorrencia.length} ` +
        "sessões prontas para revisão.";

    } catch (erro) {
      mensagemRecorrencia.textContent =
        erro.message;
    }
  }
);

// ==========================================
// SALVAR RECORRÊNCIA
// ==========================================

formularioRecorrencia.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const botao = campo("salvar-recorrencia");
    botao.disabled = true;

    mensagemRecorrencia.textContent =
      "Salvando sessões...";

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      const campanhaId = Number(
        valor("recorrencia-campanha")
      );

      const campanha = encontrarCampanha(campanhaId);

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

      const hora = valor("recorrencia-hora");

      const turno =
        valor("recorrencia-turno") ||
        obterTurno(hora);

      // Cada sessão é salva separadamente,
      // vinculada à campanha.
      //
      // Guardamos também os dados atuais
      // para preservar o histórico depois.
      //
      // O link fica vazio para acompanhar
      // o link principal da campanha.
      const registros = datasRecorrencia.map(
        data => ({
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
          status: valor("recorrencia-status"),
          canal: campanha.canal || null,
          narrador: campanha.narrador || null,
          sinopse: campanha.sinopse || null,
          imagem: campanha.imagem || null,
          link: null
        })
      );

      // Conferir duplicatas já existentes.
      const { data: existentes, error: erroConsulta } =
        await supabaseClient
          .from("eventos")
          .select("data, hora")
          .eq("campanha_id", campanhaId);

      if (erroConsulta) throw erroConsulta;

      const duplicadas = registros.filter(
        registro => (existentes || []).some(
          item =>
            item.data === registro.data &&
            formatarHora(item.hora) ===
            formatarHora(registro.hora)
        )
      );

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

      formularioRecorrencia.reset();
      limparPreviaRecorrencia();

      await carregarEventos();

      mensagemRecorrencia.textContent =
        "💜 Sessões cadastradas com sucesso!";

    } catch (erro) {
      mensagemRecorrencia.textContent =
        erro.message;

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
// CARREGAMENTO GERAL DO PAINEL
// ==========================================

async function carregarPainel() {
  try {
    const preparado =
      await verificarEstruturaBanco();

    atualizarEstadoBanco();

    if (!preparado) {
      mostrarMensagem(
        "Login realizado! 💜 " +
        "Não foi possível verificar a estrutura " +
        "do Supabase."
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

    mostrarMensagem(
      "Não foi possível carregar todos " +
      "os dados do painel."
    );
  }
}

// ==========================================
// SAIR DA CONTA
// ==========================================

botaoSair.addEventListener(
  "click",
  async () => {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      mostrarMensagem(
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

    mostrarMensagem("Você saiu da conta.");
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

      mostrarMensagem(
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
