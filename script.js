// Importação do Supabase SDK
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Configuração do Supabase
const supabaseUrl = "https://xowcgkvxzcgquxlpkrps.supabase.co";
const supabaseKey = "sb_publishable_thNdWsDiFhIAPkIygB6xgg_CWDj7mBX"; // anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do Cloudinary
const cloudName = "dcq0mwkdy"; // Cloud Name correto
const uploadPreset = "brecho_upload"; // preset configurado no painel
const assetFolder = "samples/ecommerce"; // pasta definida no preset

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
// Cadastro de usuários (mais discreto)
// ----------------------
document.getElementById("toggleRegister").addEventListener("click", () => {
  const form = document.getElementById("registerForm");
  form.style.display = form.style.display === "none" ? "block" : "none";
});

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
    document.getElementById("registerForm").style.display = "none";
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
  return { valido: true };
}

// ----------------------
// Upload para Cloudinary
// ----------------------
async function uploadCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", assetFolder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  return data.secure_url; // URL pública da imagem
}

// ----------------------
// Cadastro e edição de produtos
// ----------------------
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const idEdicao = document.getElementById("productForm").getAttribute("data-edit-id");
  const nome = document.getElementById("nome").value;
  const quantidade = document.getElementById("quantidade").value;
  const estado = document.getElementById("estado").value; // default Seminovo
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
      try {
        fotoURL = await uploadCloudinary(arquivo);
      } catch (err) {
        mostrarMensagem("productMsg", "Erro ao enviar imagem: " + err.message, "erro");
      }
    }
  }

  if (idEdicao) {
    await supabase.from("produtos").update({
      nome, quantidade, estado, preco, qualidade, descricao, foto_url: fotoURL,
      updated_at: new Date().toISOString()
    }).eq("id", idEdicao);
    mostrarMensagem("productMsg", "Produto atualizado com sucesso!", "sucesso");
    document.getElementById("productForm").removeAttribute("data-edit-id");
  } else {
    await supabase.from("produtos").insert({
      nome, quantidade, estado, preco, qualidade, descricao, foto_url: fotoURL,
      updated_at: new Date().toISOString()
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
    let contador = 1;
    data.forEach(p => {
      const row = `<tr>
        <td>Card ${contador}</td>
        <td>${p.nome}</td>
        <td>${p.quantidade}</td>
        <td>${p.estado}</td>
        <td>R$ ${p.preco}</td>
        <td>${p.qualidade}</td>
        <td>${p.updated_at ? new Date(p.updated_at).toLocaleString("pt-BR") : ""}</td>
        <td>
          <button class="editarBtn" data-id="${p.id}">Editar</button>
          <button class="excluirBtn" data-id="${p.id}">Excluir</button>
        </td>
      </tr>`;
      tbody.innerHTML += row;
      contador++;
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
    let contador = 1;
    data.forEach(p => {
      const card = `<div class="card">
        <span class="card-numero">Card ${contador}</span>
        ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nome}">` : ""}
        <h3>${p.nome}</h3>
        <p><strong>Preço:</strong> R$ ${p.preco}</p>
        <p>${p.descricao}</p>
        ${p.updated_at ? `<p style="color:red; font-size:12px">Atualizado em: ${new Date(p.updated_at).toLocaleString("pt-BR")}</p>` : ""}
      </div>`;
      vitrine.innerHTML += card;
      contador++;
    });

    // Mensagem de instrução para o cliente
    vitrine.innerHTML += `<p style="color:blue; margin-top:20px">
      Caso tenha interesse em algum produto, anote o número do card e entre em contato comigo pelo WhatsApp abaixo.
    </p>`;
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
