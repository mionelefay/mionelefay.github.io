
"use strict";

// ==========================================
// AGENDA SEMANAL COMPACTA
// Domingo a sábado, com cartões de eventos.
//
// Prioridade das imagens:
// 1. Thumbnail da live no YouTube
// 2. Imagem cadastrada no evento/campanha
// 3. Imagem padrão
// ==========================================

(function () {
  const destino = document.getElementById("agenda-semanal");

  if (!destino) return;

  const diasCurtos = [
    "DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"
  ];

  const nomesCategorias = {
    "rpg-proprio": "RPG",
    "rpg-externo": "RPG",
    podcast: "PODCAST",
    jogos: "JOGOS",
    video: "VÍDEO",
    evento: "EVENTO",
    trabalho: "TRABALHO",
    ocupado: "OCUPADO",
    livre: "LIVRE"
  };

  function elemento(tag, classe, texto) {
    const item = document.createElement(tag);

    if (classe) {
      item.className = classe;
    }

    if (texto !== undefined && texto !== null) {
      item.textContent = String(texto);
    }

    return item;
  }

  function dataLocalISO(data) {
    return [
      data.getFullYear(),
      String(data.getMonth() + 1).padStart(2, "0"),
      String(data.getDate()).padStart(2, "0")
    ].join("-");
  }

  function situacaoEvento(evento) {
    return String(
      evento.situacao || "programada"
    ).toLowerCase();
  }

  // ==========================================
  // IDENTIFICAR VÍDEOS DO YOUTUBE
  // ==========================================

  function obterIdYoutube(link) {
    if (!link || typeof link !== "string") {
      return null;
    }

    try {
      const url = new URL(link.trim());

      const host = url.hostname
        .toLowerCase()
        .replace(/^www\./, "")
        .replace(/^m\./, "");

      let id = null;

      // Exemplo: youtu.be/ABC123
      if (host === "youtu.be") {
        id = url.pathname.split("/")[1];
      }

      // Exemplos:
      // youtube.com/watch?v=ABC123
      // youtube.com/live/ABC123
      // youtube.com/shorts/ABC123
      // youtube.com/embed/ABC123
      else if (
        host === "youtube.com" ||
        host === "youtube-nocookie.com"
      ) {
        const partes = url.pathname
          .split("/")
          .filter(Boolean);

        if (partes[0] === "watch") {
          id = url.searchParams.get("v");
        } else if (
          ["live", "shorts", "embed", "v"]
            .includes(partes[0])
        ) {
          id = partes[1];
        }
      }

      // IDs de vídeos do YouTube têm 11 caracteres.
      if (
        id &&
        /^[a-zA-Z0-9_-]{11}$/.test(id)
      ) {
        return id;
      }

      return null;

    } catch (erro) {
      return null;
    }
  }

  // ==========================================
  // MINIATURAS DOS EVENTOS
  // ==========================================

  function criarImagemEvento(evento) {
    const idYoutube = obterIdYoutube(evento.link);

    const imagemCadastrada =
      typeof evento.imagem === "string"
        ? evento.imagem.trim()
        : "";

    // Lista de imagens em ordem de prioridade.
    const fontes = [];

    if (idYoutube) {
      fontes.push(
        `https://i.ytimg.com/vi/${idYoutube}/maxresdefault.jpg`
      );

      fontes.push(
        `https://i.ytimg.com/vi/${idYoutube}/hqdefault.jpg`
      );
    }

    if (imagemCadastrada) {
      fontes.push(imagemCadastrada);
    }

    // Sem nenhuma imagem disponível.
    if (fontes.length === 0) {
      return elemento(
        "div",
        "semana-evento-sem-imagem",
        "✦"
      );
    }

    const imagem = elemento(
      "img",
      "semana-evento-imagem"
    );

    imagem.alt = "";
    imagem.loading = "lazy";
    imagem.decoding = "async";

    let indiceFonte = 0;

    function tentarProximaFonte() {
      indiceFonte++;

      if (indiceFonte < fontes.length) {
        imagem.src = fontes[indiceFonte];
        return;
      }

      // Todas as imagens falharam.
      const imagemPadrao = elemento(
        "div",
        "semana-evento-sem-imagem",
        "✦"
      );

      imagem.replaceWith(imagemPadrao);
    }

    imagem.addEventListener(
      "error",
      tentarProximaFonte
    );

    imagem.src = fontes[0];

    return imagem;
  }

  // ==========================================
  // CARTÃO DE EVENTO
  // ==========================================

  function criarCartaoEvento(evento) {
    const situacao = situacaoEvento(evento);

    const cartao = elemento(
      "button",
      "semana-evento"
    );

    cartao.type = "button";

    if (evento.categoria) {
      cartao.classList.add(
        "semana-evento-" + evento.categoria
      );
    }

    if (situacao !== "programada") {
      cartao.classList.add(
        "semana-evento-alterado"
      );
    }

    // Thumbnail do YouTube ou imagem cadastrada.
    cartao.append(
      criarImagemEvento(evento)
    );

    const conteudo = elemento(
      "div",
      "semana-evento-conteudo"
    );

    const categoria = elemento(
      "span",
      "semana-evento-categoria",
      nomesCategorias[evento.categoria] || "AGENDA"
    );

    conteudo.append(categoria);

    const titulo = elemento(
      "strong",
      "semana-evento-titulo",
      evento.titulo || "Evento"
    );

    conteudo.append(titulo);

    const rodape = elemento(
      "div",
      "semana-evento-rodape"
    );

    const hora = evento.hora
      ? String(evento.hora).slice(0, 5)
      : "";

    rodape.append(
      elemento(
        "span",
        "",
        hora || "Sem horário"
      )
    );

    if (evento.canal) {
      rodape.append(
        elemento(
          "span",
          "semana-evento-canal",
          evento.canal
        )
      );
    }

    conteudo.append(rodape);

    // Cancelamentos e adiamentos.
    if (situacao === "cancelada") {
      conteudo.append(
        elemento(
          "span",
          "semana-evento-situacao",
          "❌ CANCELADA"
        )
      );
    }

    if (situacao === "adiada") {
      conteudo.append(
        elemento(
          "span",
          "semana-evento-situacao",
          "🕒 ADIADA"
        )
      );
    }

    cartao.append(conteudo);

    // Mantém a janela de detalhes original.
    cartao.addEventListener("click", () => {
      abrirEvento(evento);
    });

    return cartao;
  }

  // ==========================================
  // DISPONIBILIDADE DOS TURNOS
  // ==========================================

  function criarDisponibilidade(dataISO) {
    const resumo = elemento(
      "div",
      "semana-disponibilidade"
    );

    const eventosDoDia = eventos.filter(
      evento => evento.data === dataISO
    );

    turnos.forEach(turno => {
      const situacao = situacaoDoTurno(
        dataISO,
        turno.id,
        eventosDoDia
      );

      const indicador = elemento(
        "span",
        "semana-disponibilidade-turno"
      );

      const nome = turno.id === "manha"
        ? "M"
        : turno.id === "tarde"
          ? "T"
          : "N";

      indicador.textContent = nome;

      const descricao =
        typeof situacao === "string"
          ? situacao
          : JSON.stringify(situacao || "");

      const texto = descricao.toLowerCase();

      // Verifica parcial antes de ocupado.
      if (texto.includes("parcial")) {
        indicador.classList.add(
          "semana-turno-parcial"
        );
      } else if (texto.includes("ocupado")) {
        indicador.classList.add(
          "semana-turno-ocupado"
        );
      } else {
        indicador.classList.add(
          "semana-turno-livre"
        );
      }

      indicador.title =
        turno.nome + ": " + descricao;

      resumo.append(indicador);
    });

    return resumo;
  }

  // ==========================================
  // RENDERIZAR A SEMANA
  // ==========================================

  function renderizarAgendaSemanal() {
    destino.replaceChildren();

    const hoje = new Date();
    const hojeISO = dataLocalISO(hoje);

    // A semana começa no domingo.
    const domingo = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate() - hoje.getDay()
    );

    const sabado = new Date(
      domingo.getFullYear(),
      domingo.getMonth(),
      domingo.getDate() + 6
    );

    const formatar = data =>
      String(data.getDate()).padStart(2, "0") +
      "/" +
      String(data.getMonth() + 1).padStart(2, "0");

    const cabecalhoPeriodo = elemento(
      "p",
      "semana-periodo",
      formatar(domingo) + " a " + formatar(sabado)
    );

    destino.append(cabecalhoPeriodo);

    const grade = elemento(
      "div",
      "semana-grade"
    );

    for (let indice = 0; indice < 7; indice++) {
      const dia = new Date(
        domingo.getFullYear(),
        domingo.getMonth(),
        domingo.getDate() + indice
      );

      const iso = dataLocalISO(dia);

      const coluna = elemento(
        "article",
        "semana-dia"
      );

      if (iso === hojeISO) {
        coluna.classList.add(
          "semana-dia-hoje"
        );
      }

      const cabecalho = elemento(
        "div",
        "semana-dia-cabecalho"
      );

      cabecalho.append(
        elemento(
          "span",
          "semana-dia-nome",
          diasCurtos[indice]
        )
      );

      cabecalho.append(
        elemento(
          "strong",
          "semana-dia-numero",
          dia.getDate()
        )
      );

      if (iso === hojeISO) {
        cabecalho.append(
          elemento(
            "span",
            "semana-dia-etiqueta",
            "HOJE"
          )
        );
      }

      coluna.append(cabecalho);

      const lista = elemento(
        "div",
        "semana-dia-eventos"
      );

      const eventosDoDia = eventos
        .filter(evento => evento.data === iso)
        .sort((a, b) =>
          String(a.hora || "").localeCompare(
            String(b.hora || "")
          )
        );

      if (eventosDoDia.length) {
        eventosDoDia.forEach(evento => {
          lista.append(
            criarCartaoEvento(evento)
          );
        });
      } else {
        lista.append(
          elemento(
            "p",
            "semana-sem-eventos",
            "Sem eventos"
          )
        );
      }

      coluna.append(lista);

      coluna.append(
        criarDisponibilidade(iso)
      );

      grade.append(coluna);
    }

    destino.append(grade);
  }

  // ==========================================
  // SINCRONIZAÇÃO COM CALENDÁRIO MENSAL
  // ==========================================

  const renderizarOriginal = renderizarCalendario;

  renderizarCalendario = function (...argumentos) {
    const resultado = renderizarOriginal.apply(
      this,
      argumentos
    );

    renderizarAgendaSemanal();

    return resultado;
  };

  // Renderização inicial.
  renderizarAgendaSemanal();

})();
