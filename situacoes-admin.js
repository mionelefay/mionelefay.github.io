
"use strict";

// ==========================================
// SITUAÇÕES DOS COMPROMISSOS
// MIONE LE FAY
// ==========================================
//
// Complemento do admin.js.
// Não substitui o gerenciamento existente.
//
// Requer:
// - admin.js carregado anteriormente
// - colunas de situação no Supabase
// - função RPC remarcar_evento
// ==========================================

(function () {
  const NOMES_SITUACAO = {
    programada: "🟢 Programada",
    cancelada: "🔴 Cancelada",
    adiada: "🟡 Adiada"
  };

  const renderizarOriginal = renderizarEventos;

  let operacaoEmAndamento = false;

  function informar(texto) {
    mensagem("gerenciar-mensagem", texto);
  }

  function textoEvento(evento) {
    const campanha = evento.campanha_id
      ? encontrarCampanha(evento.campanha_id)
      : null;

    return evento.titulo ||
      campanha?.titulo ||
      "Compromisso sem título";
  }

  function situacaoEvento(evento) {
    return evento.situacao || "programada";
  }

  function criarAviso(texto, cor) {
    const aviso = criarElemento(
      "p",
      texto,
      "admin-aviso-situacao"
    );

    aviso.style.fontWeight = "700";
    aviso.style.margin = "8px 0";
    aviso.style.color = cor;

    return aviso;
  }

  function criarAcao(texto, executar, classe = "") {
    const botao = criarBotao(
      texto,
      executar,
      classe
    );

    botao.disabled = operacaoEmAndamento;

    return botao;
  }

  async function executarOperacao(operacao) {
    if (operacaoEmAndamento) return;

    operacaoEmAndamento = true;

    try {
      await exigirAdministrador();
      exigirBancoPreparado();

      informar("Salvando alteração...");

      await operacao();

      await carregarEventos();

      informar("💜 Alteração salva com sucesso!");

    } catch (erro) {
      console.error(
        "Erro ao alterar situação:",
        erro
      );

      informar(
        "Não foi possível salvar: " +
        (erro.message || "Erro desconhecido.")
      );

    } finally {
      operacaoEmAndamento = false;
      renderizarEventos();
    }
  }

  // ========================================
  // CANCELAR
  // ========================================

  async function cancelarLive(evento) {
    const titulo = textoEvento(evento);

    if (!confirm(
      `Cancelar definitivamente "${titulo}"?\n\n` +
      "A live continuará registrada na data original."
    )) {
      return;
    }

    const motivo = prompt(
      "Motivo do cancelamento (opcional):",
      evento.motivo_alteracao || ""
    );

    if (motivo === null) return;

    await executarOperacao(async () => {
      const { data, error } = await supabaseClient
        .from("eventos")
        .update({
          situacao: "cancelada",
          motivo_alteracao: motivo.trim() || null
        })
        .eq("id", evento.id)
        .eq("situacao", "programada")
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "A situação deste compromisso mudou. " +
          "Atualize a lista e tente novamente."
        );
      }
    });
  }

  // ========================================
  // ADIAR SEM NOVA DATA
  // ========================================

  async function adiarLive(evento) {
    const titulo = textoEvento(evento);

    if (!confirm(
      `Adiar "${titulo}"?\n\n` +
      "A data original permanecerá no calendário " +
      "com a indicação de adiamento."
    )) {
      return;
    }

    const motivo = prompt(
      "Motivo do adiamento (opcional):",
      evento.motivo_alteracao || ""
    );

    if (motivo === null) return;

    await executarOperacao(async () => {
      const { data, error } = await supabaseClient
        .from("eventos")
        .update({
          situacao: "adiada",
          motivo_alteracao: motivo.trim() || null
        })
        .eq("id", evento.id)
        .eq("situacao", "programada")
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Este compromisso não está mais programado."
        );
      }
    });
  }

  // ========================================
  // DEFINIR NOVA DATA
  // ========================================

  async function remarcarLive(evento) {
    const titulo = textoEvento(evento);

    const novaData = prompt(
      `Nova data para "${titulo}"\n\n` +
      "Informe no formato AAAA-MM-DD:",
      evento.data
    );

    if (novaData === null) return;

    const dataInformada = novaData.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInformada)) {
      alert(
        "Data inválida. Use o formato AAAA-MM-DD."
      );
      return;
    }

    const [ano, mes, dia] = dataInformada
      .split("-")
      .map(Number);

    const testeData = new Date(
      Date.UTC(ano, mes - 1, dia)
    );

    if (
      testeData.getUTCFullYear() !== ano ||
      testeData.getUTCMonth() + 1 !== mes ||
      testeData.getUTCDate() !== dia
    ) {
      alert("A data informada não existe.");
      return;
    }

    const novaHora = prompt(
      "Novo horário no formato HH:MM:",
      formatarHora(evento.hora)
    );

    if (novaHora === null) return;

    const horaInformada = novaHora.trim();

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(
      horaInformada
    )) {
      alert("Horário inválido. Use HH:MM.");
      return;
    }

    const motivo = prompt(
      "Motivo do adiamento (opcional):",
      evento.motivo_alteracao || ""
    );

    if (motivo === null) return;

    if (!confirm(
      `Confirmar reagendamento?\n\n` +
      `${titulo}\n` +
      `Original: ${formatarData(evento.data)} ` +
      `${formatarHora(evento.hora)}\n` +
      `Nova: ${formatarData(dataInformada)} ` +
      `${horaInformada}\n\n` +
      "O registro original será preservado."
    )) {
      return;
    }

    await executarOperacao(async () => {
      const { data, error } = await supabaseClient
        .rpc("remarcar_evento", {
          p_evento_id: evento.id,
          p_nova_data: dataInformada,
          p_nova_hora: horaInformada,
          p_motivo: motivo.trim() || null
        });

      if (error) throw error;

      if (data === null || data === undefined) {
        throw new Error(
          "O Supabase não retornou o novo compromisso."
        );
      }
    });
  }

  // ========================================
  // RESTAURAR SITUAÇÃO
  // ========================================

  async function restaurarLive(evento) {
    if (!confirm(
      `Restaurar "${textoEvento(evento)}" ` +
      "para Programada?"
    )) {
      return;
    }

    await executarOperacao(async () => {
      const { data, error } = await supabaseClient
        .from("eventos")
        .update({
          situacao: "programada",
          motivo_alteracao: null
        })
        .eq("id", evento.id)
        .is("evento_remarcado_id", null)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Não é possível restaurar este registro. " +
          "Ele pode já possuir um reagendamento."
        );
      }
    });
  }

  // ========================================
  // ORDEM DOS EVENTOS EXIBIDOS
  // ========================================

  function obterEventosDaPagina() {
    const filtrados = filtrarEventosGerenciar();

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

    return ordenados.slice(
      inicio,
      inicio + ITENS_POR_PAGINA
    );
  }

  // ========================================
  // BOTÕES NO GERENCIAMENTO
  // ========================================

  function adicionarControles() {
    const lista = campo("lista-eventos");

    if (!lista) return;

    const itens = Array.from(
      lista.querySelectorAll(".admin-item")
    );

    const eventosPagina = obterEventosDaPagina();

    eventosPagina.forEach((evento, indice) => {
      const item = itens[indice];

      if (!item) return;

      const situacao = situacaoEvento(evento);

      const cor =
        situacao === "cancelada" ? "#ff8496" :
        situacao === "adiada" ? "#ffd178" :
        "#85dcb4";

      item.append(
        criarAviso(
          NOMES_SITUACAO[situacao] ||
          situacao,
          cor
        )
      );

      if (evento.motivo_alteracao) {
        item.append(
          criarElemento(
            "p",
            "Comunicado: " +
            evento.motivo_alteracao
          )
        );
      }

      if (evento.evento_original_id) {
        const original = encontrarEvento(
          evento.evento_original_id
        );

        item.append(
          criarElemento(
            "p",
            original
              ? "↪ Remarcada de " +
                formatarData(original.data)
              : "↪ Sessão remarcada"
          )
        );
      }

      if (evento.evento_remarcado_id) {
        const novo = encontrarEvento(
          evento.evento_remarcado_id
        );

        item.append(
          criarElemento(
            "p",
            novo
              ? "📅 Nova data: " +
                formatarData(novo.data) +
                " às " +
                formatarHora(novo.hora)
              : "📅 Compromisso remarcado"
          )
        );
      }

      const acoes = criarElemento(
        "div",
        undefined,
        "admin-acoes"
      );

      acoes.style.marginTop = "10px";

      if (situacao === "programada") {
        acoes.append(
          criarAcao(
            "🕒 Adiar",
            () => adiarLive(evento)
          ),
          criarAcao(
            "📅 Remarcar",
            () => remarcarLive(evento)
          ),
          criarAcao(
            "❌ Cancelar live",
            () => cancelarLive(evento),
            "admin-perigo"
          )
        );
      }

      if (
        situacao === "adiada" &&
        !evento.evento_remarcado_id
      ) {
        acoes.append(
          criarAcao(
            "📅 Definir nova data",
            () => remarcarLive(evento)
          ),
          criarAcao(
            "↩️ Restaurar",
            () => restaurarLive(evento)
          )
        );
      }

      if (
        situacao === "cancelada" &&
        !evento.evento_remarcado_id
      ) {
        acoes.append(
          criarAcao(
            "↩️ Restaurar",
            () => restaurarLive(evento)
          )
        );
      }

      if (acoes.children.length) {
        item.append(acoes);
      }
    });
  }

  // ========================================
  // INTEGRAR AO ADMIN.JS
  // ========================================

  renderizarEventos = function () {
    renderizarOriginal();
    adicionarControles();
  };

  // Atualiza a lista caso já esteja carregada.
  if (
    typeof bancoPreparado !== "undefined" &&
    bancoPreparado
  ) {
    renderizarEventos();
  }

})();
