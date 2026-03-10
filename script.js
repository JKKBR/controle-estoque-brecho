let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

// Login simples
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const usuario = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  if (usuario === "admin" && senha === "1234") {
    document.getElementById("loginArea").style.display = "none";
    document.getElementById("painel").style.display = "block";
  } else {
    alert("Usuário ou senha incorretos!");
  }
});

// Cadastro de produtos
document.getElementById("productForm").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const nome = document.getElementById("nome").value;
  const quantidade = document.getElementById("quantidade").value;
  const estado = document.getElementById("estado").value;
  const preco = document.getElementById("preco").value;
  const qualidade = document.getElementById("qualidade").value;
  const descricao = document.getElementById("descricao").value;
  const fotoInput = document.getElementById("foto");
  
  let fotoURL = "";
  if (fotoInput.files.length > 0) {
    fotoURL = URL.createObjectURL(fotoInput.files[0]);
  }

  const produto = { nome, quantidade, estado, preco, qualidade, descricao, fotoURL };
  produtos.push(produto);
  localStorage.setItem("produtos", JSON.stringify(produtos));

  atualizarTabela();
  atualizarVitrine();
  document.getElementById("productForm").reset();
});

function atualizarTabela() {
  const tbody = document.querySelector("#productTable tbody");
  tbody.innerHTML = "";
  produtos.forEach(p => {
    const row = `<tr>
      <td>${p.nome}</td>
      <td>${p.quantidade}</td>
      <td>${p.estado}</td>
      <td>R$ ${p.preco}</td>
      <td>${p.qualidade}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

function atualizarVitrine() {
  const vitrine = document.getElementById("vitrine");
  vitrine.innerHTML = "";
  produtos.forEach(p => {
    const card = `<div class="card">
      ${p.fotoURL ? `<img src="${p.fotoURL}" alt="${p.nome}">` : ""}
      <h3>${p.nome}</h3>
      <p>R$ ${p.preco}</p>
      <p>${p.descricao}</p>
    </div>`;
    vitrine.innerHTML += card;
  });
}

function exportCSV() {
  const agora = new Date();
  const dataHora = agora.toLocaleString("pt-BR");

  let csv = `Relatório de Produtos - Exportado em ${dataHora}\n`;
  csv += "Nome,Quantidade,Estado,Preço,Qualidade,Descrição\n";

  produtos.forEach(p => {
    csv += `${p.nome},${p.quantidade},${p.estado},${p.preco},${p.qualidade},${p.descricao}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nomeArquivo = `produtos_${agora.getFullYear()}-${agora.getMonth()+1}-${agora.getDate()}_${agora.getHours()}-${agora.getMinutes()}.csv`;
  a.href = url;
  a.download = nomeArquivo;
  a.click();
}

function importCSV(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const linhas = e.target.result.split("\n").slice(1);
    linhas.forEach(linha => {
      const [nome, quantidade, estado, preco, qualidade, descricao] = linha.split(",");
      if (nome) {
        produtos.push({ nome, quantidade, estado, preco, qualidade, descricao, fotoURL: "" });
      }
    });
    localStorage.setItem("produtos", JSON.stringify(produtos));
    atualizarTabela();
    atualizarVitrine();
  };
  reader.readAsText(file);
}

// Inicializa ao carregar
atualizarTabela();
atualizarVitrine();
