
"use strict";

// Configuração pública do Supabase
const SUPABASE_URL = "https://gevkvjuaurcxokudlblc.supabase.co";
const SUPABASE_KEY = "sb_publishable_4mIXjg7273CgkxJzNGILow_0GyQ6yTd";

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

// Verifica se a conta tem acesso administrativo
// consultando a tabela protegida pelas políticas RLS.
async function verificarAdministrador() {
  const { data, error } = await supabaseClient
    .from("eventos")
    .select("id")
    .eq("status", "agendada")
    .limit(1);

  if (error) {
    throw error;
  }

  // Esta consulta não comprova privilégios administrativos.
  // Por segurança, não liberamos o painel por esse resultado.
  return false;
}

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

    // Autenticação confirmada. A autorização administrativa
    // será configurada na próxima etapa.
    mostrarLogin();
    mostrarMensagem(
      "Login realizado com sucesso! Falta ativar a verificação administrativa."
    );

  } catch (erro) {
    mostrarLogin();
    mostrarMensagem("Não foi possível entrar. Confira o e-mail e a senha.");
    console.error("Erro de autenticação:", erro.message);
  } finally {
    botaoEntrar.disabled = false;
  }
});

botaoSair.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mostrarMensagem("Não foi possível sair da conta.");
    return;
  }

  mostrarLogin();
  mostrarMensagem("Você saiu da conta.");
});

// Mantém a tela de login até configurarmos
// a autorização administrativa.
mostrarLogin();
