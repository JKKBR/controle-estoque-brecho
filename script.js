// Importação do Supabase SDK
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Configuração do Supabase
const supabaseUrl = "https://xowcgkvxzcgquxlpkrps.supabase.co";
const supabaseKey = "sb_publishable_thNdWsDiFhIAPkIygB6xgg_CWDj7mBX"; // anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para mostrar mensagens visuais
function mostrarMensagem(id, texto, tipo="erro") {
  const div = document.getElementById(id);
  div.className = "mensagem " + tipo;
  div.textContent = texto;
}

// ----------------------
// Login / Logout
// ----------------------
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    mostrarMensagem("loginMsg", "Erro: " + error.message, "erro");
  } else {
    document.getElementById("loginArea").style.display = "none";
    document.getElementById("painel").style.display = "block";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  document.getElementById("painel").style.display = "none";
  document.getElementById("loginArea").style.display = "block";
  mostrarMensagem("loginMsg", "Você saiu da conta.", "sucesso");
});

// ----------------------
// Cadastro de usuários
// ----------------------
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoEmail = document.getElementById("novoEmail").value;
  const novaSenha = document.getElementById("novaSenha").value;
  const { error } = await supabase.auth.signUp({ email: novoEmail, password: novaSenha });
  if (error) {
    mostrarMensagem("registerMsg", "Erro: " + error.message, "erro");
  } else {
    mostrarMensagem("registerMsg", "Novo usuário cadastrado com sucesso!", "sucesso");
    document.getElementById("registerForm").reset();
  }
});

// ----------------------
// Função de validação de arquivo
// ----------------------
function validarArquivo(arquivo) {
  if (!arquivo) return { valido: false, msg: "Nenhum arquivo selecionado." };

  if (arquivo.size > 50 * 1024 * 1024) {
    return { valido: false, msg: "Arquivo muito grande. Máx: 50 MB." };
  }

  const nomeArquivo = Date.now() + "-" + arquivo.name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, "_") // troca espaços por _
    .replace(/[^a-zA-Z0-9._-]/g, ""); // remove caracteres inválidos

  return { valido: true, nomeArquivo };
}

// ----------------------
// Cadastro e edição de produtos (com Storage)
// ----------------------
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const idEdicao = document.getElementById("productForm").getAttribute("data-edit-id");
  const nome = document.getElementById("nome").value;
  const quantidade = document.getElementById("quantidade").value;
  const estado = document.getElementById("estado").value;
  const preco = document.getElementById("preco").value;
  const qualidade = document.getElementById("qualidade").value;
  const descricao = document.getElementById("descricao").value;
  const fotoInput = document.getElementById("foto");

  let fotoURL = "";
  if (fotoInput.files.length > 0) {
    const arquivo = fotoInput.files[0];
    const validacao = validarArquivo(arquivo);

    if (!validacao.valido) {
      mostrarMensagem("productMsg", validacao.msg, "erro");
    } else {
      const { data, error } = await supabase.storage
        .from("fotos") // bucket único
        .upload(validacao.nomeArquivo, arquivo, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) {
        mostrarMensagem("productMsg", "Erro ao enviar imagem: " + error.message, "erro");
      } else if (data) {
        fotoURL = supabase.storage.from("fotos").getPublicUrl(data.path).data.publicUrl;
      }
    }
  }

  if (idEdicao) {
    await supabase.from("produtos").update({
      nome, quantidade, estado, preco, qualidade, descricao, foto_url: fotoURL
    }).eq("id", idEdicao);
    mostrarMensagem("productMsg", "Produto atualizado com sucesso!", "sucesso");
    document.getElementById("productForm").removeAttribute("data-edit-id");
  } else {
    await supabase.from("produtos").insert({
      nome, quantidade, estado, preco, qualidade, descricao, foto_url: fotoURL
    });
    mostrarMensagem("productMsg", "Produto cadastrado com sucesso!", "sucesso");
  }
  document.getElementById("productForm").reset();
  carregarProdutos();
  atualizarVitrine();
});

// ----------------------
// Relatório Administrativo com Editar/Excluir
// ----------------------
async function carregarProdutos() {
  const { data, error } = await supabase.from("produtos").select("*");
  const tbody = document.querySelector("#productTable tbody");
  tbody.innerHTML = "";
  if (!error) {
    data.forEach(p => {
      const row = `<tr>
        <td>${p.nome}</td>
        <td>${p.quantidade}</td>
        <td>${p.estado}</td>
        <td>R$ ${p.preco}</td>
        <td>${p.qualidade}</td>
        <td>
          <button class="editarBtn" data-id="${p.id}">Editar</button>
          <button class="excluirBtn" data-id="${p.id}">Excluir</button>
        </td>
      </tr>`;
      tbody.innerHTML += row;
    });

    document.querySelectorAll(".excluirBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        await supabase.from("produtos").delete().eq("id", id);
        mostrarMensagem("productMsg", "Produto excluído com sucesso!", "sucesso");
        carregarProdutos();
        atualizarVitrine();
      });
    });

    document.querySelectorAll(".editarBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const { data } = await supabase.from("produtos").select("*").eq("id", id).single();
        if (data) {
          document.getElementById("nome").value = data.nome;
          document.getElementById("quantidade").value = data.quantidade;
          document.getElementById("estado").value = data.estado;
          document.getElementById("preco").value = data.preco;
          document.getElementById("qualidade").value = data.qualidade;
          document.getElementById("descricao").value = data.descricao || "";
          document.getElementById("productForm").setAttribute("data-edit-id", id);
        }
      });
    });
  }
}
carregarProdutos();

// ----------------------
// Vitrine pública
// ----------------------
async function atualizarVitrine() {
  const { data, error } = await supabase.from("produtos").select("*");
  const vitrine = document.getElementById("vitrine");
  vitrine.innerHTML = "";
  if (!error) {
    data.forEach(p => {
      const card = `<div class="card">
        ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nome}">` : ""}
        <h3>${p.nome}</h3>
        <p><strong>Preço:</strong> R$ ${p.preco}</p>
        <p>${p.descricao}</p>
      </div>`;
      vitrine.innerHTML += card;
    });
  }
}
atualizarVitrine();

// ----------------------
// Banner dinâmico
// ----------------------
const frasesPre = [
  "Confira nossas novidades!",
  "Peças únicas esperando por você!",
  "Novidades fresquinhas no brechó!",
  "Garimpe já sua próxima peça favorita!"
];

const bannerDiv = document.getElementById("banner");
const selectFrase = document.getElementById("frasePre");

// Preenche o select com frases pré-montadas
frasesPre.forEach(f => {
  const opt = document.createElement("option");
  opt.value = f;
  opt.textContent = f;
  selectFrase.appendChild(opt);
});

// Atualiza o banner no painel e na vitrine
async function atualizarBanner() {
  const { data, error } = await supabase.from("config").select("*").eq("id", 1).single();
  if (!error && data) {
    bannerDiv.querySelector("h2").textContent = data.texto;
    document.getElementById("painelBanner").textContent = "Frase atual do banner: " + data.texto;
  } else {
    bannerDiv.querySelector("h2").textContent = frasesPre[0];
    document.getElementById("painelBanner").textContent = "Nenhuma frase definida ainda.";
  }
}

// Formulário para atualizar o banner
document.getElementById("bannerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectFrase = document.getElementById("frasePre").value;
  const fraseCustom = document.getElementById("fraseCustom").value.trim();
  const texto = fraseCustom !== "" ? fraseCustom : selectFrase;

  const { error } = await supabase.from("config").upsert({ id: 1, texto });
  if (error) {
    mostrarMensagem("bannerMsg", "Erro ao atualizar banner: " + error.message, "erro");
  } else {
    mostrarMensagem("bannerMsg", "Banner atualizado com sucesso!", "sucesso");
    atualizarBanner();
  }
});

// Inicializa o banner ao carregar
atualizarBanner();
