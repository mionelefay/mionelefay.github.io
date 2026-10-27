
"use strict";

// Configuração pública do Supabase
const SUPABASE_URL = "https://gevkvjuaurcxokudlblc.supabase.co";
const SUPABASE_KEY = "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";

// Identificador da conta administrativa
const ADMIN_UID = "5f0cd47a-7c6f-4fc5-99d8-449534c393e8";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const formulario = document.getElementById("login-form");
const campoEmail = document.getElementById("admin-email");
const campoSenha = document.getElementById("admin-senha");
const botaoEntrar = document.getElementById("entrar");
const mensagem = document.getElementById("admin-mensagem");
const areaAdmin = document.getElementById("area-admin");
const botaoSair = document.getElementById("sair");

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

// Verifica a identidade da conta autenticada.
// As políticas RLS do Supabase protegem os dados.
async function verificarAdministrador() {
  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
    return false;
  }

  return user.id === ADMIN_UID;
}

// Login administrativo
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

    // Verificar se a conta é administradora
    const autorizado = await verificarAdministrador();

    if (!autorizado) {
      await supabaseClient.auth.signOut();
      mostrarLogin();
      mostrarMensagem("Esta conta não possui acesso administrativo.");
      return;
    }

    // Liberar a interface administrativa
    mostrarPainel();
    mostrarMensagem("Login administrativo realizado com sucesso! 💜");

  } catch (erro) {
    mostrarLogin();
    mostrarMensagem("Não foi possível entrar. Confira o e-mail e a senha.");
    console.error("Erro de autenticação:", erro.message);

  } finally {
    botaoEntrar.disabled = false;
  }
});

// Sair da conta
botaoSair.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mostrarMensagem("Não foi possível sair da conta.");
    return;
  }

  mostrarLogin();
  mostrarMensagem("Você saiu da conta.");
});

// Verificar se já existe uma sessão autenticada
async function iniciarPainel() {
  mostrarLogin();

  try {
    const autorizado = await verificarAdministrador();

    if (autorizado) {
      mostrarPainel();
      mostrarMensagem("Sessão administrativa ativa. 💜");
    }
  } catch (erro) {
    console.error("Erro ao verificar sessão:", erro.message);
  }
}

iniciarPainel();

