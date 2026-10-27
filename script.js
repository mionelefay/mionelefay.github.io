
"use strict";
// Conexão com o Supabase
const SUPABASE_URL = "https://gevkvjuaurcxokudlblc.supabase.co";

const SUPABASE_KEY = "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Agenda Mione Le Fay
// Eventos demonstrativos. Substituiremos pelos eventos reais.

const categorias = {
  "rpg-proprio": "🎲 RPG no meu canal",
  "rpg-externo": "🧙 RPG em outros canais",
  "podcast": "🎙️ Participação em Podcast",
  "jogos": "🎮 Jogos no meu canal",
  "video": "🎬 Vídeo postado"
};

const hoje = new Date();
let mesExibido = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
let filtroAtual = "todas";

let eventos = [];

const calendario = document.getElementById("calendario");
const tituloMes = document.getElementById("mes-atual");
const modal = document.getElementById("modal");

function formatarData(dataTexto) {
  const [ano, mes, dia] = dataTexto.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function criarPostit(evento) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "postit " + evento.categoria;

  const horario = document.createElement("small");
  horario.textContent = evento.hora;

  const nome = document.createElement("strong");
  nome.textContent = evento.titulo;

  botao.append(horario, nome);
  botao.addEventListener("click", () => abrirEvento(evento));

  return botao;
}

function renderizarCalendario() {
  calendario.replaceChildren();

  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();

  tituloMes.textContent = mesExibido.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  diasSemana.forEach(nome => {
    const elemento = document.createElement("div");
    elemento.className = "dia-semana";
    elemento.textContent = nome;
    calendario.appendChild(elemento);
  });

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  for (let i = 0; i < primeiroDia; i++) {
    const vazio = document.createElement("div");
    vazio.className = "dia vazio";
    calendario.appendChild(vazio);
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const celula = document.createElement("div");
    celula.className = "dia";

    if (
      dia === hoje.getDate() &&
      mes === hoje.getMonth() &&
      ano === hoje.getFullYear()
    ) {
      celula.classList.add("hoje");
    }

    const numero = document.createElement("div");
    numero.className = "numero-dia";
    numero.textContent = dia;
    celula.appendChild(numero);

    const data = [
      ano,
      String(mes + 1).padStart(2, "0"),
      String(dia).padStart(2, "0")
    ].join("-");

    eventos
      .filter(evento =>
        evento.data === data &&
        (filtroAtual === "todas" || evento.categoria === filtroAtual)
      )
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .forEach(evento => celula.appendChild(criarPostit(evento)));

    calendario.appendChild(celula);
  }
}

function abrirEvento(evento) {
  document.getElementById("modal-titulo").textContent = evento.titulo;
  document.getElementById("modal-categoria").textContent =
    categorias[evento.categoria];
  document.getElementById("modal-canal").textContent =
    "📺 Canal: " + evento.canal;
  document.getElementById("modal-data").textContent =
    "📅 " + formatarData(evento.data) + " às " + evento.hora;
  document.getElementById("modal-sinopse").textContent = evento.sinopse;

  const imagem = document.getElementById("modal-imagem");
  imagem.hidden = true;
  imagem.removeAttribute("src");

  if (evento.imagem) {
    imagem.src = evento.imagem;
    imagem.hidden = false;
  }

  const link = document.getElementById("modal-link");
  link.textContent = evento.categoria === "video"
    ? "▶ Ver vídeo"
    : "▶ Assistir transmissão";

  if (evento.link && /^https?:\/\//i.test(evento.link)) {
    link.href = evento.link;
    link.hidden = false;
  } else {
    link.removeAttribute("href");
    link.hidden = true;
  }

  modal.classList.remove("oculto");
  document.getElementById("fechar-modal").focus();
}

function fecharModal() {
  modal.classList.add("oculto");
}

document.getElementById("mes-anterior").addEventListener("click", () => {
  mesExibido = new Date(
    mesExibido.getFullYear(),
    mesExibido.getMonth() - 1,
    1
  );
  renderizarCalendario();
});

document.getElementById("mes-proximo").addEventListener("click", () => {
  mesExibido = new Date(
    mesExibido.getFullYear(),
    mesExibido.getMonth() + 1,
    1
  );
  renderizarCalendario();
});

document.querySelectorAll(".filtro").forEach(botao => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.categoria;

    document.querySelectorAll(".filtro").forEach(item => {
      item.classList.toggle("ativo", item === botao);
    });

    renderizarCalendario();
  });
});

document.getElementById("fechar-modal").addEventListener("click", fecharModal);

modal.addEventListener("click", evento => {
  if (evento.target === modal) fecharModal();
});

document.addEventListener("keydown", evento => {
  if (evento.key === "Escape") fecharModal();
});
// Exibir o calendário inicialmente
renderizarCalendario();

// Carregar eventos publicados do Supabase
async function carregarEventos() {
  const { data, error } = await supabaseClient
    .from("eventos")
    .select("id, titulo, categoria, data, hora, canal, sinopse, imagem, link")
    .eq("status", "publicada")
    .order("data", { ascending: true })
    .order("hora", { ascending: true });

  if (error) {
    console.error("Erro ao carregar eventos:", error.message);
    return;
  }

  eventos = (data || []).map(evento => ({
    ...evento,
    hora: evento.hora ? evento.hora.slice(0, 5) : ""
  }));

  renderizarCalendario();
}

carregarEventos();
