
"use strict";

// ==========================================
// SITUAÇÕES DO CALENDÁRIO PÚBLICO
// MIONE LE FAY
// ==========================================
//
// Complemento do script.js e google-agenda.js.
// Preserva os eventos originais e os filtros.
// ==========================================

(function () {
  function situacao(evento) {
    return evento?.situacao || "programada";
  }

  function inativo(evento) {
    return ["cancelada", "adiada"].includes(
      situacao(evento)
    );
  }

  function buscarRelacionado(id) {
    if (id === null || id === undefined) {
      return null;
    }

    return eventos.find(
      item => String(item.id) === String(id)
    ) || null;
  }

  function formatarDataCurta(data) {
    if (!data) return "";

    const partes = data.split("-");

    return [
      partes[2],
      partes[1],
      partes[0]
    ].join("/");
  }

  // ========================================
  // DISPONIBILIDADE
  // ========================================

  // O evento cancelado ou adiado continua
  // visível, mas deixa de ocupar o turno.

  const integrarCampanhaOriginal =
    integrarCampanha;

  integrarCampanha = function (evento) {
    const integrado =
      integrarCampanhaOriginal(evento);

    if (!inativo(integrado)) {
      return integrado;
    }

    return {
      ...integrado,
      bloqueia_turno: false
    };
  };

  // Compromissos inativos também não devem
  // determinar disponibilidade explícita.

  const situacaoDoTurnoOriginal =
    situacaoDoTurno;

  situacaoDoTurno = function (
    dataTexto,
    turnoId,
    eventosDoDia
  ) {
    const ativos = eventosDoDia.filter(
      evento => !inativo(evento)
    );

    return situacaoDoTurnoOriginal(
      dataTexto,
      turnoId,
      ativos
    );
  };

  // ========================================
  // IDENTIFICAÇÃO NOS POST-ITS
  // ========================================

  const criarPostitOriginal = criarPostit;

  criarPostit = function (evento) {
    const postit = criarPostitOriginal(evento);
    const estado = situacao(evento);

    if (estado === "programada") {
      return postit;
    }

    const etiqueta = document.createElement("span");

    etiqueta.className =
      "etiqueta-situacao etiqueta-" + estado;

    etiqueta.textContent =
      estado === "cancelada"
        ? "❌ CANCELADA"
        : "🕒 ADIADA";

    postit.classList.add(
      "postit-" + estado
    );

    postit.prepend(etiqueta);

    return postit;
  };

  // ========================================
  // AVISOS NA JANELA DE DETALHES
  // ========================================

  const abrirEventoAnterior = abrirEvento;

  abrirEvento = function (evento) {
    abrirEventoAnterior(evento);

    const modal = document.getElementById("modal");

    const titulo = document.getElementById(
      "modal-titulo"
    );

    const estado = situacao(evento);

    // Remove avisos de um evento aberto
    // anteriormente, evitando duplicações.

    modal.querySelectorAll(
      ".aviso-situacao-publico"
    ).forEach(elemento => elemento.remove());

    if (estado !== "programada") {
      const aviso = document.createElement("div");

      aviso.className =
        "aviso-situacao-publico aviso-" + estado;

      const cabecalho =
        document.createElement("strong");

      cabecalho.textContent =
        estado === "cancelada"
          ? "❌ TRANSMISSÃO CANCELADA"
          : "🕒 TRANSMISSÃO ADIADA";

      aviso.append(cabecalho);

      if (evento.motivo_alteracao) {
        const motivo = document.createElement("p");

        motivo.textContent =
          evento.motivo_alteracao;

        aviso.append(motivo);
      }

      if (estado === "adiada") {
        const novo = buscarRelacionado(
          evento.evento_remarcado_id
        );

        const informacao =
          document.createElement("p");

        informacao.textContent = novo
          ? "📅 Nova data: " +
            formatarDataCurta(novo.data) +
            " às " +
            formatarHora(novo.hora)
          : "📅 Nova data a confirmar.";

        aviso.append(informacao);
      }

      titulo.insertAdjacentElement(
        "afterend",
        aviso
      );

      // Não oferecer ações de uma
      // transmissão que não ocorrerá
      // na data original.

      const botaoGoogle = document.getElementById(
        "modal-google-agenda"
      );

      if (botaoGoogle) {
        botaoGoogle.hidden = true;
        botaoGoogle.removeAttribute("href");
      }

      const linkTransmissao =
        document.getElementById("modal-link");

      if (linkTransmissao) {
        linkTransmissao.hidden = true;
        linkTransmissao.removeAttribute("href");
      }
    }

    // Identifica a origem de uma
    // transmissão remarcada.

    if (
      estado === "programada" &&
      evento.evento_original_id
    ) {
      const original = buscarRelacionado(
        evento.evento_original_id
      );

      if (original) {
        const aviso = document.createElement("div");

        aviso.className =
          "aviso-situacao-publico aviso-remarcada";

        aviso.textContent =
          "📅 Nova data da transmissão " +
          "originalmente prevista para " +
          formatarDataCurta(original.data) +
          ".";

        titulo.insertAdjacentElement(
          "afterend",
          aviso
        );
      }
    }
  };

  // ========================================
  // ESTILOS
  // ========================================

  const estilo = document.createElement("style");

  estilo.textContent = `
    .postit-cancelada {
      opacity: 0.76;
      border: 1px solid #d87991 !important;
    }

    .postit-adiada {
      border: 1px solid #e6b95c !important;
    }

    .etiqueta-situacao {
      display: block;
      width: fit-content;
      max-width: 100%;
      margin-bottom: 6px;
      padding: 3px 7px;
      border-radius: 5px;
      font-size: 0.7rem;
      font-weight: 800;
      line-height: 1.3;
      letter-spacing: 0.03em;
    }

    .etiqueta-cancelada {
      background: #6c2638;
      color: #ffe0e6;
    }

    .etiqueta-adiada {
      background: #73521e;
      color: #fff0c7;
    }

    .aviso-situacao-publico {
      padding: 14px;
      margin: 12px 0 18px;
      border-radius: 10px;
      line-height: 1.6;
    }

    .aviso-situacao-publico strong {
      display: block;
      margin-bottom: 5px;
    }

    .aviso-situacao-publico p {
      margin: 7px 0 0;
    }

    .aviso-cancelada {
      background: #492031;
      border: 1px solid #d87991;
      color: #ffe1e8;
    }

    .aviso-adiada {
      background: #46351f;
      border: 1px solid #e6b95c;
      color: #fff0c7;
    }

    .aviso-remarcada {
      background: #332448;
      border: 1px solid #a97bdd;
      color: #f0ddff;
    }
  `;

  document.head.append(estilo);
})();
