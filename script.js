
"use strict";

// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://gevkvjuaurcxokudlblc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// CATEGORIAS
// ==========================================

const categorias = {
  "rpg-proprio": "🎲 RPG no meu canal",
  "rpg-externo": "🧙 RPG em outros canais",
  podcast: "🎙️ Participação em Podcast",
  jogos: "🎮 Jogos no meu canal",
  video: "🎬 Vídeo postado",
  evento: "🎪 Evento externo",
  trabalho: "💼 Trabalho",
  ocupado: "🔴 Ocupado",
  livre: "🟢 Livre"
};

// ==========================================
// TURNOS
// ==========================================

const turnos = [
  {
    id: "manha",
    nome: "☀️ Manhã",
    inicio: "06:00",
    fim: "12:00"
  },
  {
    id: "tarde",
    nome: "🌤️ Tarde",
    inicio: "12:00",
    fim: "18:00"
  },
  {
    id: "noite",
    nome: "🌙 Noite",
    inicio: "18:00",
    fim: "00:00"
  }
];

// ==========================================
// ESTADO DO CALENDÁRIO
// ==========================================

const hoje = new Date();

let mesExibido = new Date(
  hoje.getFullYear(),
  hoje.getMonth(),
  1
);

let filtroAtual = "todas";

let eventos = [];
let campanhas = [];

const calendario =
  document.getElementById("calendario");

const tituloMes =
  document.getElementById("mes-atual");

const modal =
  document.getElementById("modal");

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarData(dataTexto) {
  if (!dataTexto) return "";

  const [ano, mes, dia] =
    dataTexto.split("-").map(Number);

  return new Date(
    ano,
    mes - 1,
    dia
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatarHora(hora) {
  return hora ? hora.slice(0, 5) : "";
}

function obterTurno(hora) {
  if (!hora) return "noite";

  if (hora >= "06:00" && hora < "12:00") {
    return "manha";
  }

  if (hora >= "12:00" && hora < "18:00") {
    return "tarde";
  }

  return "noite";
}

function dataISO(ano, mes, dia) {
  return [
    ano,
    String(mes + 1).padStart(2, "0"),
    String(dia).padStart(2, "0")
  ].join("-");
}

function dataAtualISO() {
  const agora = new Date();

  return dataISO(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );
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

// ==========================================
// INTEGRAÇÃO COM CAMPANHAS
// ==========================================

function integrarCampanha(evento) {
  if (!evento.campanha_id) {
    return evento;
  }

  const campanha = campanhas.find(
    item => Number(item.id) ===
      Number(evento.campanha_id)
  );

  if (!campanha) {
    return evento;
  }

  const sessaoPassada =
    evento.data < dataAtualISO();

  // Sessões anteriores priorizam os dados
  // que foram salvos no compromisso.
  //
  // Se um campo histórico estiver vazio,
  // usamos o cadastro da campanha como
  // alternativa. Isso não recupera versões
  // antigas que nunca foram armazenadas.

  if (sessaoPassada) {
    return {
      ...evento,
      titulo:
        evento.titulo || campanha.titulo,
      categoria:
        evento.categoria || campanha.categoria,
      canal:
        evento.canal || campanha.canal,
      narrador:
        evento.narrador || campanha.narrador,
      sinopse:
        evento.sinopse || campanha.sinopse,
      imagem:
        evento.imagem || campanha.imagem,
      link:
        evento.link || campanha.link
    };
  }

  // Sessões futuras acompanham os dados
  // atuais da campanha.
  //
  // O título e o link específicos do
  // compromisso continuam prioritários.

  return {
    ...evento,
    titulo:
      evento.titulo || campanha.titulo,
    categoria:
      campanha.categoria || evento.categoria,
    canal:
      campanha.canal || evento.canal,
    narrador:
      campanha.narrador || evento.narrador,
    sinopse:
      campanha.sinopse || evento.sinopse,
    imagem:
      campanha.imagem || evento.imagem,
    link:
      evento.link || campanha.link
  };
}

// ==========================================
// DISPONIBILIDADE PADRÃO
// ==========================================

function disponibilidadePadrao(
  dataTexto,
  turnoId
) {
  const [ano, mes, dia] =
    dataTexto.split("-").map(Number);

  const diaSemana = new Date(
    ano,
    mes - 1,
    dia
  ).getDay();

  const fimDeSemana =
    diaSemana === 0 || diaSemana === 6;

  if (fimDeSemana) {
    return "livre";
  }

  if (
    turnoId === "manha" ||
    turnoId === "tarde"
  ) {
    return "ocupado";
  }

  return "livre";
}

// ==========================================
// EVENTOS DE UM TURNO
// ==========================================

function eventosNoTurno(
  eventosDoDia,
  turnoId
) {
  return eventosDoDia
    .filter(evento => {
      const turnoEvento =
        evento.turno ||
        obterTurno(evento.hora);

      return turnoEvento === turnoId;
    })
    .sort((a, b) => {
      return formatarHora(a.hora).localeCompare(
        formatarHora(b.hora)
      );
    });
}

// ==========================================
// SITUAÇÃO REAL DO TURNO
// ==========================================

function situacaoDoTurno(
  dataTexto,
  turnoId,
  eventosDoDia
) {
  const padrao = disponibilidadePadrao(
    dataTexto,
    turnoId
  );

  const compromissos = eventosNoTurno(
    eventosDoDia,
    turnoId
  );

  const bloqueado = compromissos.some(
    evento => evento.bloqueia_turno !== false
  );

  // Compromissos explícitos de disponibilidade
  // podem substituir o padrão do calendário.

  const indisponibilidadeExplicita =
    compromissos.some(
      evento => evento.categoria === "ocupado"
    );

  const disponibilidadeExplicita =
    compromissos.some(
      evento => evento.categoria === "livre"
    );

  if (indisponibilidadeExplicita) {
    return "ocupado";
  }

  if (bloqueado) {
    return "ocupado";
  }

  if (disponibilidadeExplicita) {
    return "livre";
  }

  return padrao;
}

// ==========================================
// POST-ITS DOS COMPROMISSOS
// ==========================================

function criarPostit(evento) {
  const botao = criarElemento(
    "button",
    undefined,
    "postit " + evento.categoria
  );

  botao.type = "button";

  const horario = criarElemento(
    "small",
    formatarHora(evento.hora)
  );

  const nome = criarElemento(
    "strong",
    evento.titulo || "Compromisso"
  );

  botao.append(horario, nome);

  botao.addEventListener(
    "click",
    () => abrirEvento(evento)
  );

  return botao;
}

// ==========================================
// POST-ITS DE DISPONIBILIDADE
// ==========================================

function criarPostitDisponibilidade(
  situacao,
  parcial = false
) {
  const classe =
    situacao === "livre"
      ? "postit livre"
      : "postit ocupado";

  const elemento = criarElemento(
    "div",
    undefined,
    classe + " postit-disponibilidade"
  );

  if (parcial) {
    elemento.textContent =
      "🟡 Parcialmente disponível";
  } else {
    elemento.textContent =
      situacao === "livre"
        ? "🟢 Livre"
        : "🔴 Ocupado";
  }

  return elemento;
}

// ==========================================
// EXIBIÇÃO DOS TURNOS
// ==========================================

function criarTurno(
  dataTexto,
  turno,
  eventosDoDia,
  filtro = "todas"
) {
  const bloco = criarElemento(
    "section",
    undefined,
    "calendario-turno"
  );

  bloco.dataset.turno = turno.id;

  const cabecalho = criarElemento(
    "div",
    undefined,
    "turno-cabecalho"
  );

  cabecalho.append(
    criarElemento(
      "span",
      turno.nome,
      "turno-nome"
    )
  );

  const lista = criarElemento(
    "div",
    undefined,
    "turno-eventos"
  );

  const compromissos = eventosNoTurno(
    eventosDoDia,
    turno.id
  );

  const situacao = situacaoDoTurno(
    dataTexto,
    turno.id,
    eventosDoDia
  );

  // ========================================
  // FILTROS DE DISPONIBILIDADE
  // ========================================

  if (
    filtro === "livre" ||
    filtro === "ocupado"
  ) {
    if (situacao === filtro) {
      lista.append(
        criarPostitDisponibilidade(situacao)
      );
    }

    bloco.append(cabecalho, lista);

    return bloco;
  }

  // ========================================
  // EXIBIÇÃO NORMAL
  // ========================================

  compromissos.forEach(evento => {
    lista.append(criarPostit(evento));
  });

  const padrao = disponibilidadePadrao(
    dataTexto,
    turno.id
  );

  const bloqueado = compromissos.some(
    evento => evento.bloqueia_turno !== false
  );

  if (compromissos.length === 0) {
    lista.append(
      criarPostitDisponibilidade(situacao)
    );

  } else if (
    !bloqueado &&
    situacao === "livre" &&
    padrao === "livre"
  ) {
    lista.append(
      criarPostitDisponibilidade(
        "livre",
        true
      )
    );

  } else if (
    !bloqueado &&
    situacao === "livre" &&
    padrao === "ocupado"
  ) {
    // Quando a disponibilidade foi
    // liberada explicitamente, mostramos
    // a situação atual do turno.

    lista.append(
      criarPostitDisponibilidade("livre")
    );
  }

  bloco.append(cabecalho, lista);

  return bloco;
}

// ==========================================
// RENDERIZAR CALENDÁRIO
// ==========================================

function renderizarCalendario() {
  calendario.replaceChildren();

  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();

  tituloMes.textContent =
    mesExibido.toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric"
      }
    );

  const diasSemana = [
    "Dom",
    "Seg",
    "Ter",
    "Qua",
    "Qui",
    "Sex",
    "Sáb"
  ];

  diasSemana.forEach(nome => {
    calendario.append(
      criarElemento(
        "div",
        nome,
        "dia-semana"
      )
    );
  });

  const primeiroDia =
    new Date(ano, mes, 1).getDay();

  const totalDias =
    new Date(ano, mes + 1, 0).getDate();

  for (
    let indice = 0;
    indice < primeiroDia;
    indice++
  ) {
    calendario.append(
      criarElemento(
        "div",
        undefined,
        "dia vazio"
      )
    );
  }

  for (
    let dia = 1;
    dia <= totalDias;
    dia++
  ) {
    const celula = criarElemento(
      "div",
      undefined,
      "dia"
    );

    const data = dataISO(
      ano,
      mes,
      dia
    );

    if (
      dia === hoje.getDate() &&
      mes === hoje.getMonth() &&
      ano === hoje.getFullYear()
    ) {
      celula.classList.add("hoje");
    }

    celula.append(
      criarElemento(
        "div",
        String(dia),
        "numero-dia"
      )
    );

    // Todos os compromissos do dia,
    // independentemente do filtro.
    //
    // Isso é importante para calcular
    // corretamente a disponibilidade.

    const eventosDoDia = eventos.filter(
      evento => evento.data === data
    );

    if (
      filtroAtual === "todas" ||
      filtroAtual === "livre" ||
      filtroAtual === "ocupado"
    ) {
      turnos.forEach(turno => {
        const situacao = situacaoDoTurno(
          data,
          turno.id,
          eventosDoDia
        );

        // Em filtros específicos de
        // disponibilidade, não mostramos
        // turnos com situação diferente.

        if (
          filtroAtual !== "todas" &&
          situacao !== filtroAtual
        ) {
          return;
        }

        celula.append(
          criarTurno(
            data,
            turno,
            eventosDoDia,
            filtroAtual
          )
        );
      });

    } else {
      // Categorias específicas mostram
      // apenas os compromissos daquela
      // categoria.

      eventosDoDia
        .filter(
          evento =>
            evento.categoria === filtroAtual
        )
        .sort(
          (a, b) =>
            formatarHora(a.hora).localeCompare(
              formatarHora(b.hora)
            )
        )
        .forEach(evento => {
          celula.append(
            criarPostit(evento)
          );
        });
    }

    calendario.append(celula);
  }
}

// ==========================================
// JANELA DE DETALHES
// ==========================================

function abrirEvento(evento) {
  const titulo =
    document.getElementById("modal-titulo");

  const categoria =
    document.getElementById("modal-categoria");

  const canal =
    document.getElementById("modal-canal");

  const data =
    document.getElementById("modal-data");

  const sinopse =
    document.getElementById("modal-sinopse");

  titulo.textContent =
    evento.titulo || "Compromisso";

  categoria.textContent =
    categorias[evento.categoria] ||
    evento.categoria;

  const detalhes = [];

  if (evento.canal) {
    detalhes.push(
      "📺 Canal/local: " + evento.canal
    );
  }

  if (
    evento.narrador &&
    (
      evento.categoria === "rpg-proprio" ||
      evento.categoria === "rpg-externo"
    )
  ) {
    detalhes.push(
      "🎲 Narrador(a): " + evento.narrador
    );
  }

  canal.textContent = detalhes.join(" • ");

  data.textContent =
    "📅 " +
    formatarData(evento.data) +
    " às " +
    formatarHora(evento.hora);

  sinopse.textContent =
    evento.sinopse || "";

  const imagem =
    document.getElementById("modal-imagem");

  imagem.hidden = true;
  imagem.removeAttribute("src");

  if (evento.imagem) {
    imagem.src = evento.imagem;
    imagem.hidden = false;
  }

  const link =
    document.getElementById("modal-link");

  if (evento.categoria === "video") {
    link.textContent = "▶ Ver vídeo";

  } else if (evento.categoria === "evento") {
    link.textContent =
      "🔗 Informações do evento";

  } else {
    link.textContent =
      "▶ Assistir transmissão";
  }

  if (
    evento.link &&
    /^https?:\/\//i.test(evento.link)
  ) {
    link.href = evento.link;
    link.hidden = false;

  } else {
    link.removeAttribute("href");
    link.hidden = true;
  }

  modal.classList.remove("oculto");

  document
    .getElementById("fechar-modal")
    .focus();
}

function fecharModal() {
  modal.classList.add("oculto");
}

// ==========================================
// NAVEGAÇÃO ENTRE MESES
// ==========================================

document
  .getElementById("mes-anterior")
  .addEventListener("click", () => {
    mesExibido = new Date(
      mesExibido.getFullYear(),
      mesExibido.getMonth() - 1,
      1
    );

    renderizarCalendario();
  });

document
  .getElementById("mes-proximo")
  .addEventListener("click", () => {
    mesExibido = new Date(
      mesExibido.getFullYear(),
      mesExibido.getMonth() + 1,
      1
    );

    renderizarCalendario();
  });

// ==========================================
// FILTROS
// ==========================================

document
  .querySelectorAll(".filtro")
  .forEach(botao => {
    botao.addEventListener(
      "click",
      () => {
        filtroAtual =
          botao.dataset.categoria;

        document
          .querySelectorAll(".filtro")
          .forEach(item => {
            item.classList.toggle(
              "ativo",
              item === botao
            );
          });

        renderizarCalendario();
      }
    );
  });

// ==========================================
// CONTROLE DO MODAL
// ==========================================

document
  .getElementById("fechar-modal")
  .addEventListener(
    "click",
    fecharModal
  );

modal.addEventListener(
  "click",
  evento => {
    if (evento.target === modal) {
      fecharModal();
    }
  }
);

document.addEventListener(
  "keydown",
  evento => {
    if (evento.key === "Escape") {
      fecharModal();
    }
  }
);

// ==========================================
// CARREGAR CAMPANHAS E COMPROMISSOS
// ==========================================

async function carregarAgenda() {
  try {
    const [
      respostaCampanhas,
      respostaEventos
    ] = await Promise.all([
      supabaseClient
        .from("campanhas")
        .select(
          "id, titulo, categoria, narrador, canal, sinopse, imagem, link"
        ),

      supabaseClient
        .from("eventos")
        .select(
          "id, titulo, categoria, data, hora, canal, " +
          "sinopse, imagem, link, narrador, turno, " +
          "bloqueia_turno, campanha_id"
        )
        .eq("status", "publicada")
        .order("data", { ascending: true })
        .order("hora", { ascending: true })
    ]);

    if (respostaCampanhas.error) {
      throw respostaCampanhas.error;
    }

    if (respostaEventos.error) {
      throw respostaEventos.error;
    }

    campanhas =
      respostaCampanhas.data || [];

    eventos =
      (respostaEventos.data || [])
        .map(evento => ({
          ...evento,
          hora: formatarHora(evento.hora)
        }))
        .map(integrarCampanha);

    renderizarCalendario();

  } catch (erro) {
    console.error(
      "Erro ao carregar agenda:",
      erro.message
    );
  }
}

// ==========================================
// INICIALIZAR
// ==========================================

renderizarCalendario();
carregarAgenda();
