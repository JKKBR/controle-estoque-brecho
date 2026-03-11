// Importação do Supabase SDK
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Configuração do Supabase
const supabaseUrl = "https://xowcgkvxzcgquxlpkrps.supabase.co";
const supabaseKey = "sb_publishable_thNdWsDiFhIAPkIygB6xgg_CWDj7mBX"; // anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do Cloudinary
const cloudName = "dcq0mwkdy";
const uploadPreset = "brecho_upload";
const assetFolder = "samples/ecommerce";

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
    carregarProdutos();
    atualizarBanner();
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  document.getElementById("painel").style.display = "none";
  document.getElementById("loginArea").style.display = "block";
  mostrarMensagem("loginMsg", "Você saiu da conta.", "sucesso");
});

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
  return { url: data.secure_url };
}

// ----------------------
// Cadastro e edição de produtos
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
    try {
      const fotoData = await uploadCloudinary(arquivo);
      fotoURL = fotoData.url;
    } catch (err) {
      mostrarMensagem("productMsg", "Erro ao enviar imagem: " + err.message, "erro");
    }
  }

  if (idEdicao) {
    await supabase.from("produtos").update({
      nome, quantidade, estado, preco, qualidade, descricao,
      foto_url: fotoURL,
      updated_at: new Date().toISOString()
    }).eq("id", idEdicao);
    mostrarMensagem("productMsg", "Produto atualizado com sucesso!", "sucesso");
    document.getElementById("productForm").removeAttribute("data-edit-id");
  } else {
    await supabase.from("produtos").insert({
      nome, quantidade, estado, preco, qualidade, descricao,
      foto_url: fotoURL || null,
      reservado: false, vendido: false,
      updated_at: new Date().toISOString()
    });
    mostrarMensagem("productMsg", "Produto cadastrado com sucesso!", "sucesso");
  }
  document.getElementById("productForm").reset();
  carregarProdutos();
  atualizarVitrine();
});

// ----------------------
// Relatório Administrativo
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
          <button class="reservarBtn" data-id="${p.id}">${p.reservado ? "Liberar" : "Reservar"}</button>
          <button class="vendidoBtn" data-id="${p.id}">${p.vendido ? "Liberar" : "Vendido"}</button>
        </td>
      </tr>`;
      tbody.innerHTML += row;
      contador++;
    });

    // Excluir produto
    document.querySelectorAll(".excluirBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        await supabase.from("produtos").delete().eq("id", id);
        mostrarMensagem("productMsg", "Produto excluído com sucesso!", "sucesso");
        carregarProdutos();
        atualizarVitrine();
      });
    });

    // Editar
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

    // Reservar / Liberar
    document.querySelectorAll(".reservarBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const { data } = await supabase.from("produtos").select("reservado").eq("id", id).single();
        const novoStatus = !data.reservado;
        await supabase.from("produtos").update({ reservado: novoStatus }).eq("id", id);
        mostrarMensagem("productMsg", novoStatus ? "Produto marcado como reservado!" : "Produto liberado!", "sucesso");
        carregarProdutos();
        atualizarVitrine();
      });
    });

    // Vendido / Liberar
    document.querySelectorAll(".vendidoBtn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const { data } = await supabase.from("produtos").select("vendido").eq("id", id).single();
        const novoStatus = !data.vendido;
        await supabase.from("produtos").update({ vendido: novoStatus }).eq("id", id);
        mostrarMensagem("productMsg", novoStatus ? "Produto marcado como vendido!" : "Produto liberado!", "sucesso");
        carregarProdutos();
        atualizarVitrine();
      });
    });
  }
}
carregarProdutos();

// ----------------------
// Vitrine Pública + Filtros
// ----------------------
async function atualizarVitrine() {
  const { data, error } = await supabase.from("produtos").select("*");
  if (!error) {
    renderizarVitrine(data);
    document.getElementById("vitrine").style.display = "flex";
  }
}

function renderizarVitrine(data) {
  const vitrine = document.getElementById("vitrine");
  vitrine.innerHTML = "";
  let contador = 1;
  data.forEach(p => {
    const card = `<div class="card">
      <span class="card-numero">Card ${contador}</span>
      ${p.reservado ? `<span style="color:red; font-weight:bold;">Reservado</span>` : ""}
      ${p.vendido ? `<span style="color:red; font-weight:bold;">Vendido</span>` : ""}
      ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nome}">` : ""}
      <h3>${p.nome}</h3>
      <p><strong>Preço:</strong> R$ ${p.preco}</p>
      <p>${p.descricao || ""}</p>
    </div>`;
    vitrine.innerHTML += card;
    contador++;
  });
}

// ----------------------
// Filtros
// ----------------------
document.getElementById("aplicarFiltros").addEventListener("click", async () => {
  const precoMax = document.getElementById("precoMax").value;
  const estado = document.getElementById("estadoFiltro").value;
  const qualidade = document.getElementById("qualidadeFiltro").value;

  let query = supabase.from("produtos").select("*");
  if (precoMax) query = query.lte("preco", precoMax);
  if (estado) query = query.eq("estado", estado);
  if (qualidade) query = query.eq("qualidade", qualidade);

  const { data, error } = await query;
  if (!error) {
    renderizarVitrine(data);
    document.getElementById("vitrine").style.display = "flex";
  }
});

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

frasesPre.forEach(f => {
  const opt = document.createElement("option");
  opt.value = f;
  opt.textContent = f;
  selectFrase.appendChild(opt);
});

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

// ----------------------
// Inicialização
// ----------------------
atualizarVitrine();
atualizarBanner();
