
"use strict";

// ==========================================
// GOOGLE AGENDA
// CALENDÁRIO MIONE LE FAY
// ==========================================

// Duração estimada de cada compromisso,
// utilizada apenas no Google Agenda.

const GOOGLE_AGENDA_DURACAO_MINUTOS = 120;

// Fuso horário utilizado pelo calendário.

const GOOGLE_AGENDA_FUSO = "America/Sao_Paulo";

// ==========================================
// FORMATAÇÃO DAS DATAS
// ==========================================

function formatarDataGoogleAgenda(
  data,
  hora,
  minutosAdicionais = 0
) {
  const partesData = data.split("-").map(Number);
  const partesHora = hora.split(":").map(Number);

  const ano = partesData[0];
  const mes = partesData[1];
  const dia = partesData[2];

  const horas = partesHora[0];
  const minutos = partesHora[1] || 0;

  // Usamos UTC somente para fazer a
  // aritmética das datas sem depender
  // do fuso horário do navegador.
  //
  // O resultado é enviado ao Google
  // como horário local de São Paulo.

  const resultado = new Date(
    Date.UTC(
      ano,
      mes - 1,
      dia,
      horas,
      minutos + minutosAdicionais
    )
  );

  const anoFinal =
    resultado.getUTCFullYear();

  const mesFinal =
    String(
      resultado.getUTCMonth() + 1
    ).padStart(2, "0");

  const diaFinal =
    String(
      resultado.getUTCDate()
    ).padStart(2, "0");

  const horaFinal =
    String(
      resultado.getUTCHours()
    ).padStart(2, "0");

  const minutoFinal =
    String(
      resultado.getUTCMinutes()
    ).padStart(2, "0");

  return (
    anoFinal +
    mesFinal +
    diaFinal +
    "T" +
    horaFinal +
    minutoFinal +
    "00"
  );
}

// ==========================================
// CRIAR LINK DO GOOGLE AGENDA
// ==========================================

function criarLinkGoogleAgenda(evento) {
  if (!evento || !evento.data || !evento.hora) {
    return null;
  }

  const hora = String(evento.hora).slice(0, 5);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(evento.data) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
  ) {
    return null;
  }

  const inicio = formatarDataGoogleAgenda(
    evento.data,
    hora
  );

  const fim = formatarDataGoogleAgenda(
    evento.data,
    hora,
    GOOGLE_AGENDA_DURACAO_MINUTOS
  );

  const titulo =
    evento.titulo || "Compromisso Mione Le Fay";

  const descricao = [];

  if (evento.sinopse) {
    descricao.push(evento.sinopse);
  }

  if (evento.narrador) {
    descricao.push(
      "Narrador(a): " + evento.narrador
    );
  }

  if (evento.canal) {
    descricao.push(
      "Canal/local: " + evento.canal
    );
  }

  if (evento.link) {
    descricao.push(
      "Link da transmissão: " + evento.link
    );
  }

  descricao.push(
    "Agenda de Lives da Mione Le Fay"
  );

  descricao.push(
    "https://mionelefay.github.io/#agenda"
  );

  const parametros = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: inicio + "/" + fim,
    ctz: GOOGLE_AGENDA_FUSO,
    details: descricao.join("\n\n")
  });

  return (
    "https://calendar.google.com/calendar/render?" +
    parametros.toString()
  );
}

// ==========================================
// ATUALIZAR BOTÃO NO MODAL
// ==========================================

function atualizarBotaoGoogleAgenda(evento) {
  const botao = document.getElementById(
    "modal-google-agenda"
  );

  if (!botao) {
    return;
  }

  const endereco = criarLinkGoogleAgenda(evento);

  if (!endereco) {
    botao.hidden = true;
    botao.removeAttribute("href");
    return;
  }

  botao.href = endereco;
  botao.hidden = false;
}

// ==========================================
// INTEGRAR AO CALENDÁRIO EXISTENTE
// ==========================================

// O script.js já possui a função abrirEvento,
// responsável por abrir os detalhes da live.
//
// Vamos aproveitar essa função, sem alterar
// o funcionamento original do calendário.

if (typeof abrirEvento === "function") {
  const abrirEventoOriginal = abrirEvento;

  abrirEvento = function(evento) {
    abrirEventoOriginal(evento);

    atualizarBotaoGoogleAgenda(evento);
  };
} else {
  console.error(
    "Google Agenda: função abrirEvento não encontrada."
  );
}
