
"use strict";

// ==========================================
// MODALIDADE DAS CAMPANHAS
// Extensão do admin.js existente
// ==========================================

(function configurarModalidadeCampanhas() {
  const formulario =
    document.getElementById("campanha-form");

  const categoria =
    document.getElementById("campanha-categoria");

  const canal =
    document.getElementById("campanha-canal");

  const link =
    document.getElementById("campanha-link");

  if (!formulario || !categoria || !canal || !link) {
    return;
  }

  const rotuloCategoria = categoria.closest("label");
  const rotuloCanal = canal.closest("label");
  const rotuloLink = link.closest("label");

  // Cria o campo de modalidade.
  const rotuloModalidade = document.createElement("label");

  rotuloModalidade.htmlFor = "campanha-modalidade";
  rotuloModalidade.textContent = "Modalidade da campanha";

  const seletor = document.createElement("select");

  seletor.id = "campanha-modalidade";
  seletor.required = true;

  seletor.add(
    new Option("📺 Transmitida", "transmitida")
  );

  seletor.add(
    new Option("🎲 Offline (sem transmissão)", "offline")
  );

  rotuloModalidade.append(seletor);
  rotuloCategoria.before(rotuloModalidade);

  const ajuda = document.createElement("p");

  ajuda.className = "admin-ajuda";
  ajuda.textContent =
    "Campanhas offline aparecem no carrossel " +
    "quando estão em andamento, sem precisar " +
    "de canal ou link de transmissão.";

  rotuloModalidade.after(ajuda);

  let categoriaAnterior = "rpg-externo";

  // Atualiza os campos visíveis.
  function atualizarModalidade() {
    const offline = seletor.value === "offline";

    if (offline) {
      if (categoria.value) {
        categoriaAnterior = categoria.value;
      }

      // Mantém compatibilidade com o calendário.
      categoria.value = "rpg-externo";
    } else {
      categoria.value =
        categoriaAnterior || "rpg-externo";
    }

    rotuloCategoria.hidden = offline;
    rotuloCanal.hidden = offline;
    rotuloLink.hidden = offline;

    if (offline) {
      canal.value = "";
      link.value = "";
    }
  }

  seletor.addEventListener(
    "change",
    atualizarModalidade
  );

  categoria.addEventListener("change", () => {
    if (seletor.value !== "offline") {
      categoriaAnterior = categoria.value;
    }
  });

  // Inclui a modalidade nos dados salvos.
  const obterDadosOriginal = dadosFormularioCampanha;

  dadosFormularioCampanha = function () {
    const dados = obterDadosOriginal();

    dados.detalhes.modalidade = seletor.value;

    if (seletor.value === "offline") {
      dados.categoria = "rpg-externo";
      dados.canal = "";
      dados.link = "";
    }

    return dados;
  };

  // Recupera a modalidade ao editar.
  const editarOriginal = editarCampanha;

  editarCampanha = function (id) {
    editarOriginal(id);

    const campanha = encontrarCampanha(id);

    seletor.value =
      campanha?.detalhes?.modalidade === "offline"
        ? "offline"
        : "transmitida";

    categoriaAnterior =
      campanha?.categoria || "rpg-externo";

    atualizarModalidade();
  };

  // Restaura o padrão ao cancelar ou salvar.
  const cancelarOriginal = cancelarEdicaoCampanha;

  cancelarEdicaoCampanha = function () {
    cancelarOriginal();

    seletor.value = "transmitida";
    categoriaAnterior = "rpg-externo";

    atualizarModalidade();
  };

  // Mostra a modalidade na lista administrativa.
  const renderizarOriginal = renderizarCampanhas;

  renderizarCampanhas = function () {
    renderizarOriginal();

    const itens = document.querySelectorAll(
      "#lista-campanhas .admin-item"
    );

    campanhas.forEach((campanha, indice) => {
      const item = itens[indice];

      if (!item) return;

      const texto = document.createElement("p");

      const offline =
        campanha.detalhes?.modalidade === "offline";

      texto.textContent = offline
        ? "🎲 Modalidade: Offline"
        : "📺 Modalidade: Transmitida";

      item.querySelector(".admin-acoes")?.before(texto);
    });
  };

  atualizarModalidade();
})();
