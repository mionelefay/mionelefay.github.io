
"use strict";

// ==========================================
// AGENDA SEMANAL
// Reutiliza os eventos, turnos e componentes
// do calendário mensal.
// ==========================================

// Este arquivo deve ser carregado depois
// de situacoes-calendario.js.

(function () {
  const destino =
    document.getElementById("agenda-semanal");

  if (!destino) return;

  function renderizarAgendaSemanal() {
    destino.replaceChildren();

    const agora = new Date();

    // A semana começa no domingo.
    const domingo = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate() - agora.getDay()
    );

    const dias = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado"
    ];

    for (let indice = 0; indice < 7; indice++) {
      const dia = new Date(
        domingo.getFullYear(),
        domingo.getMonth(),
        domingo.getDate() + indice
      );

      const iso = dataISO(
        dia.getFullYear(),
        dia.getMonth(),
        dia.getDate()
      );

      const eventosDoDia = eventos.filter(
        evento => evento.data === iso
      );

      const artigo =
        document.createElement("article");

      artigo.className = "agenda-semanal-dia";

      if (iso === dataAtualISO()) {
        artigo.classList.add("agenda-semanal-hoje");
      }

      // ======================================
      // CABEÇALHO DO DIA
      // ======================================

      const cabecalho =
        document.createElement("div");

      cabecalho.className =
        "agenda-semanal-dia-cabecalho";

      const titulo =
        document.createElement("strong");

      titulo.textContent =
        dias[indice] + ", " +
        String(dia.getDate()).padStart(2, "0") +
        "/" +
        String(dia.getMonth() + 1).padStart(2, "0");

      cabecalho.append(titulo);

      if (iso === dataAtualISO()) {
        const etiqueta =
          document.createElement("span");

        etiqueta.className =
          "agenda-semanal-etiqueta-hoje";

        etiqueta.textContent = "Hoje";

        cabecalho.append(etiqueta);
      }

      artigo.append(cabecalho);

      // ======================================
      // TURNOS E COMPROMISSOS
      // ======================================

      const turnosDia =
        document.createElement("div");

      turnosDia.className =
        "agenda-semanal-turnos";

      // Usa exatamente as mesmas funções
      // do calendário mensal, incluindo
      // disponibilidade, cancelamentos,
      // adiamentos e abertura dos detalhes.

      turnos.forEach(turno => {
        turnosDia.append(
          criarTurno(
            iso,
            turno,
            eventosDoDia,
            "todas"
          )
        );
      });

      artigo.append(turnosDia);

      destino.append(artigo);
    }
  }

  // ========================================
  // SINCRONIZAÇÃO COM CALENDÁRIO MENSAL
  // ========================================

  // Quando o calendário mensal for atualizado,
  // a agenda semanal também será atualizada.

  const renderizarCalendarioOriginal =
    renderizarCalendario;

  renderizarCalendario = function (...argumentos) {
    const resultado =
      renderizarCalendarioOriginal.apply(
        this,
        argumentos
      );

    renderizarAgendaSemanal();

    return resultado;
  };

  // Renderização inicial.
  renderizarAgendaSemanal();
})();
