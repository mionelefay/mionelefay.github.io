
"use strict";

// ==========================================
// AGENDA SEMANAL COMPACTA
// Domingo a sábado, com cartões de eventos.
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

    if (classe) item.className = classe;

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
    return String(evento.situacao || "programada")
      .toLowerCase();
  }

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
      cartao.classList.add("semana-evento-alterado");
    }

    // Miniatura do evento.
    if (evento.imagem) {
      const imagem = elemento(
        "img",
        "semana-evento-imagem"
      );

      imagem.src = evento.imagem;
      imagem.alt = "";
      imagem.loading = "lazy";

      cartao.append(imagem);
    } else {
      const imagemPadrao = elemento(
        "div",
        "semana-evento-sem-imagem",
        "✦"
      );

      cartao.append(imagemPadrao);
    }

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
      elemento("span", "", hora || "Sem horário")
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

    cartao.addEventListener("click", () => {
      abrirEvento(evento);
    });

    return cartao;
  }

  function criarDisponibilidade(dataISO) {
    const resumo = elemento(
      "div",
      "semana-disponibilidade"
    );

    turnos.forEach(turno => {
      const situacao = situacaoDoTurno(
        dataISO,
        turno.id,
        eventos.filter(evento => evento.data === dataISO)
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

      // A disponibilidade continua sendo calculada
      // pelas regras do calendário mensal.
      const descricao = typeof situacao === "string"
        ? situacao
        : JSON.stringify(situacao || "");

      const texto = descricao.toLowerCase();

      if (texto.includes("ocupado")) {
        indicador.classList.add("semana-turno-ocupado");
      } else if (texto.includes("parcial")) {
        indicador.classList.add("semana-turno-parcial");
      } else {
        indicador.classList.add("semana-turno-livre");
      }

      indicador.title =
        turno.nome + ": " + descricao;

      resumo.append(indicador);
    });

    return resumo;
  }

  function renderizarAgendaSemanal() {
    destino.replaceChildren();

    const hoje = new Date();
    const hojeISO = dataLocalISO(hoje);

    const domingo = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate() - hoje.getDay()
    );

    const cabecalhoPeriodo = elemento(
      "p",
      "semana-periodo"
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

    cabecalhoPeriodo.textContent =
      formatar(domingo) + " a " + formatar(sabado);

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
        coluna.classList.add("semana-dia-hoje");
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
          lista.append(criarCartaoEvento(evento));
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
      coluna.append(criarDisponibilidade(iso));
      grade.append(coluna);
    }

    destino.append(grade);
  }

  // ==========================================
  // SINCRONIZAÇÃO COM O CALENDÁRIO MENSAL
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

  renderizarAgendaSemanal();
})();
