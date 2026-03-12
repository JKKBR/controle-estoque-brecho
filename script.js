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
    atualizarPrazo();
    carregarMovimentacao();
    carregarGraficoBarras();
    carregarGraficoAnual();
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
        await supabase.from("produtos").update({ vendido: novoStatus, data_venda: novoStatus ? new Date().toISOString() : null }).eq("id", id);
        mostrarMensagem("productMsg", novoStatus ? "Produto marcado como vendido!" : "Produto liberado!", "sucesso");
        carregarProdutos();
        atualizarVitrine();
        carregarMovimentacao();
      });
    });
  }
}

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
      <p><strong>Estado:</strong> ${p.estado}</p>
      <p><strong>Qualidade:</strong> ${p.qualidade}</p>
      <p>${p.descricao || ""}</p>
    </div>`;
    vitrine.innerHTML += card;
    contador++;
  });
}

// ----------------------
// Filtros (estado e qualidade)
// ----------------------
document.getElementById("aplicarFiltros").addEventListener("click", async () => {
  const estado = document.getElementById("estadoFiltro").value;
  const qualidade = document.getElementById("qualidadeFiltro").value;

  let query = supabase.from("produtos").select("*");
  if (estado) query = query.eq("estado", estado);
  if (qualidade) query = query.eq("qualidade", qualidade);

  const { data, error } = await query;
  if (!error) {
    renderizarVitrine(data);
    document.getElementById("vitrine").style.display = "flex";
  }
});

// ----------------------
// Movimentação do Site + Prazo
// ----------------------
async function carregarMovimentacao() {
  const { data: produtos } = await supabase.from("produtos").select("*");
  const { data: config } = await supabase.from("config").select("*").eq("id", 1).single();
  const diasVisivel = config?.dias_visivel_vendido || 7;

  const tbody = document.querySelector("#movimentacaoTable tbody");
  tbody.innerHTML = "";

  produtos.forEach(p => {
    if (p.reservado || p.vendido) {
      let status = p.reservado ? "Reservado" : "Vendido";
      let dataInicio = "";
      let dataRemocao = "";

      if (p.reservado && p.updated_at) {
        dataInicio = new Date(p.updated_at).toLocaleString("pt-BR");
      }

      if (p.vendido && p.data_venda) {
        const dataVenda = new Date(p.data_venda);
        dataInicio = dataVenda.toLocaleString("pt-BR");
        const dataExpira = new Date(dataVenda);
        dataExpira.setDate(dataExpira.getDate() + diasVisivel);
        dataRemocao = dataExpira.toLocaleString("pt-BR");
      }

      const row = `<tr>
        <td>${p.nome}</td>
        <td>${status}</td>
        <td>${dataInicio}</td>
        <td>${dataRemocao}</td>
      </tr>`;
      tbody.innerHTML += row;
    }
  });
}

async function atualizarPrazo() {
  const { data } = await supabase.from("config").select("*").eq("id", 1).single();
  if (data) {
    document.getElementById("diasVisivel").value = data.dias_visivel_vendido || 7;
    document.getElementById("painelPrazo").textContent = 
      "Prazo atual: " + (data.dias_visivel_vendido || 7) + " dias";
  }
}

document.getElementById("prazoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dias = parseInt(document.getElementById("diasVisivel").value);
  await supabase.from("config").upsert({ id: 1, dias_visivel_vendido: dias });
  document.getElementById("prazoMsg").textContent = "Prazo atualizado com sucesso!";
  atualizarPrazo();
  carregarMovimentacao();
});

// ----------------------
// Exportações CSV
// ----------------------
function exportarMovimentacaoCSV() { /* ... já implementado */ }
function exportarMovimentacaoPorMes() { /* ... já implementado */ }
async function exportarMovimentacaoPorAno() { /* ... já implementado */ }
async function exportarMovimentacaoMultiAno() { /* ... já implementado */ }

// ----------------------
// Resumo Mensal + Gráficos
// ----------------------
async function carregarResumoMensal(mesSelecionado) { /* ... já implementado */ }
let graficoMensal;
let graficoBarras;
let graficoAnual;

async function carregarGraficoBarras() { /* ... já implementado */ }
async function carregarGraficoAnual() { /* ... já implementado */ }

// ----------------------
// Eventos dos Botões
// ----------------------
document.getElementById("exportarCSV").addEventListener("click", exportarMovimentacaoCSV);
document.getElementById("exportarCSVmes").addEventListener("click", exportarMovimentacaoPorMes);
document.getElementById("exportarCSVano").addEventListener("click", exportarMovimentacaoPorAno);
document.getElementById("exportarCSVmultiAno").addEventListener("click", exportarMovimentacaoMultiAno);

// ----------------------
// Inicialização
// ----------------------

// Carrega produtos para o painel administrativo
carregarProdutos();

// Atualiza vitrine pública
atualizarVitrine();

// Atualiza prazo configurado para produtos vendidos
atualizarPrazo();

// Carrega movimentação (reservados e vendidos)
carregarMovimentacao();

// Carrega gráficos comparativos
carregarGraficoBarras();
carregarGraficoAnual();

// Eventos dos botões de exportação
document.getElementById("exportarCSV").addEventListener("click", exportarMovimentacaoCSV);
document.getElementById("exportarCSVmes").addEventListener("click", exportarMovimentacaoPorMes);
document.getElementById("exportarCSVano").addEventListener("click", exportarMovimentacaoPorAno);
document.getElementById("exportarCSVmultiAno").addEventListener("click", exportarMovimentacaoMultiAno);

// Atualiza resumo mensal quando selecionar mês
document.getElementById("mesSelect").addEventListener("change", (e) => {
  carregarResumoMensal(e.target.value);
});

// ----------------------
// Funções de Exportação CSV
// ----------------------
document.getElementById("exportarCSV").addEventListener("click", exportarMovimentacaoCSV);
document.getElementById("exportarCSVmes").addEventListener("click", exportarMovimentacaoPorMes);
document.getElementById("exportarCSVano").addEventListener("click", exportarMovimentacaoPorAno);
document.getElementById("exportarCSVmultiAno").addEventListener("click", exportarMovimentacaoMultiAno);

// ----------------------
// Inicialização Final
// ----------------------

// Carrega dados iniciais ao abrir o painel
(async () => {
  await carregarProdutos();        // Produtos no painel administrativo
  await atualizarVitrine();        // Vitrine pública
  await atualizarPrazo();          // Prazo configurado
  await carregarMovimentacao();    // Movimentação (reservados/vendidos)
  await carregarGraficoBarras();   // Gráfico mensal comparativo
  await carregarGraficoAnual();    // Gráfico anual comparativo
})();

