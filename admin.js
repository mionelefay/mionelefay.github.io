
"use strict";

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const SUPABASE_URL = "https://gevkvjuaurcxokudlblc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";

// Identificador da conta administrativa
const ADMIN_UID = "5f0cd47a-7c6f-4fc5-99d8-449534c393e8";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==========================================
// ELEMENTOS DO PAINEL
// ==========================================

// Login
const formulario = document.getElementById("login-form");
const campoEmail = document.getElementById("admin-email");
const campoSenha = document.getElementById("admin-senha");
const botaoEntrar = document.getElementById("entrar");
const mensagem = document.getElementById("admin-mensagem");
const areaAdmin = document.getElementById("area-admin");
const botaoSair = document.getElementById("sair");

// Cadastro de eventos
const formularioEvento = document.getElementById("evento-form");
const botaoSalvarEvento = document.getElementById("salvar-evento");
const mensagemEvento = document.getElementById("evento-mensagem");


// ==========================================
// MENSAGENS E VISIBILIDADE
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


// ==========================================
// VERIFICAÇÃO ADMINISTRATIVA
// ==========================================

// Confere a identidade da conta autenticada.
// A segurança dos dados é aplicada pelas
// políticas RLS configuradas no Supabase.

async function verificarAdministrador() {
  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
    return false;
  }

  return user.id === ADMIN_UID;
}


// ==========================================
// LOGIN ADMINISTRATIVO
// ==========================================

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  botaoEntrar.disabled = true;
  mostrarMensagem("Verificando credenciais...");

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: campoEmail.value.trim(),
      password: campoSenha.value
    });

    if (error) {
      throw error;
    }

    campoSenha.value = "";

    // Confirmar se a conta é administradora
    const autorizado = await verificarAdministrador();

    if (!autorizado) {
      await supabaseClient.auth.signOut();

      mostrarLogin();
      mostrarMensagem(
        "Esta conta não possui acesso administrativo."
      );

      return;
    }

    // Exibir o painel
    mostrarPainel();

    mostrarMensagem(
      "Login administrativo realizado com sucesso! 💜"
    );

  } catch (erro) {
    mostrarLogin();

    mostrarMensagem(
      "Não foi possível entrar. Confira o e-mail e a senha."
    );

    console.error(
      "Erro de autenticação:",
      erro.message
    );

  } finally {
    botaoEntrar.disabled = false;
  }
});


// ==========================================
// CADASTRO DE EVENTOS
// ==========================================

formularioEvento.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  botaoSalvarEvento.disabled = true;
  mensagemEvento.textContent = "Salvando evento...";

  try {
    // Confirmar que a sessão pertence
    // à conta administrativa autorizada
    const autorizado = await verificarAdministrador();

    if (!autorizado) {
      mostrarLogin();

      throw new Error(
        "Acesso administrativo não autorizado."
      );
    }

    // Reunir os dados do formulário
    const novoEvento = {
      titulo: document
        .getElementById("evento-titulo")
        .value.trim(),

      categoria: document
        .getElementById("evento-categoria")
        .value,

      data: document
        .getElementById("evento-data")
        .value,

      hora: document
        .getElementById("evento-hora")
        .value,

      canal: document
        .getElementById("evento-canal")
        .value.trim(),

      sinopse: document
        .getElementById("evento-sinopse")
        .value.trim(),

      imagem: document
        .getElementById("evento-imagem")
        .value.trim(),

      link: document
        .getElementById("evento-link")
        .value.trim(),

      status: document
        .getElementById("evento-status")
        .value
    };

    // Enviar os dados para a tabela eventos
    const { error } = await supabaseClient
      .from("eventos")
      .insert([novoEvento]);

    if (error) {
      throw error;
    }

    // Limpar os campos após salvar
    formularioEvento.reset();

    mensagemEvento.textContent =
      "💜 Evento cadastrado com sucesso!";

  } catch (erro) {
    mensagemEvento.textContent =
      "Não foi possível salvar o evento. Verifique os dados e tente novamente.";

    console.error(
      "Erro ao salvar evento:",
      erro.message
    );

  } finally {
    botaoSalvarEvento.disabled = false;
  }
});


// ==========================================
// SAIR DA CONTA
// ==========================================

botaoSair.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mostrarMensagem(
      "Não foi possível sair da conta."
    );
    return;
  }

  mostrarLogin();

  mensagemEvento.textContent = "";

  mostrarMensagem(
    "Você saiu da conta."
  );
});


// ==========================================
// VERIFICAR SESSÃO EXISTENTE
// ==========================================

async function iniciarPainel() {
  mostrarLogin();

  try {
    const autorizado = await verificarAdministrador();

    if (autorizado) {
      mostrarPainel();

      mostrarMensagem(
        "Sessão administrativa ativa. 💜"
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao verificar sessão:",
      erro.message
    );
  }
}


// ==========================================
// INICIALIZAR O PAINEL
// ==========================================

iniciarPainel();
