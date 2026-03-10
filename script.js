// Configuração do Firebase (copiada do console)
const firebaseConfig = {
  apiKey: "AIzaSyC2YRmvvaqayWaIx2ax9JdGWV1HgAxiiRE",
  authDomain: "brecho-logistica.firebaseapp.com",
  projectId: "brecho-logistica",
  storageBucket: "brecho-logistica.appspot.com",
  messagingSenderId: "673397280509",
  appId: "1:673397280509:web:0858666b2a2be125c30f894",
  measurementId: "G-ERQEMWND9Y"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login com Firebase Authentication
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      document.getElementById("loginArea").style.display = "none";
      document.getElementById("painel").style.display = "block";
    })
    .catch(err => {
      let mensagem = "";
      switch (err.code) {
        case "auth/invalid-email":
          mensagem = "Formato de email inválido.";
          break;
        case "auth/user-not-found":
          mensagem = "Usuário não encontrado. Verifique o email digitado.";
          break;
        case "auth/wrong-password":
          mensagem = "Senha incorreta. Tente novamente.";
          break;
        case "auth/too-many-requests":
          mensagem = "Muitas tentativas. Aguarde alguns minutos.";
          break;
        default:
          mensagem = "Erro ao entrar: " + err.message;
      }
      alert(mensagem);
    });
});

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  auth.signOut().then(() => {
    document.getElementById("painel").style.display = "none";
    document.getElementById("loginArea").style.display = "block";
  });
});

// Cadastro de novos usuários (apenas no painel admin)
document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const novoEmail = document.getElementById("novoEmail").value;
  const novaSenha = document.getElementById("novaSenha").value;

  auth.createUserWithEmailAndPassword(novoEmail, novaSenha)
    .then(() => {
      alert("Novo usuário cadastrado com sucesso!");
      document.getElementById("registerForm").reset();
    })
    .catch(err => {
      let mensagem = "";
      switch (err.code) {
        case "auth/email-already-in-use":
          mensagem = "Este email já está em uso.";
          break;
        case "auth/invalid-email":
          mensagem = "Formato de email inválido.";
          break;
        case "auth/weak-password":
          mensagem = "Senha muito fraca. Use pelo menos 6 caracteres.";
          break;
        default:
          mensagem = "Erro ao cadastrar usuário: " + err.message;
      }
      alert(mensagem);
    });
});

// Cadastro de produtos (salva no Firestore)
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

  db.collection("produtos").add({ nome, quantidade, estado, preco, qualidade, descricao, fotoURL })
    .then(() => {
      alert("Produto cadastrado!");
      document.getElementById("productForm").reset();
    })
    .catch(err => alert("Erro ao salvar: " + err.message));
});

// Atualiza tabela administrativa
function atualizarTabela() {
  const tbody = document.querySelector("#productTable tbody");
  db.collection("produtos").onSnapshot(snapshot => {
    tbody.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const row = `<tr>
        <td>${p.nome}</td>
        <td>${p.quantidade}</td>
        <td>${p.estado}</td>
        <td>R$ ${p.preco}</td>
        <td>${p.qualidade}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  });
}

// Atualiza vitrine pública
function atualizarVitrine() {
  const vitrine = document.getElementById("vitrine");
  db.collection("produtos").onSnapshot(snapshot => {
    vitrine.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const card = `<div class="card">
        ${p.fotoURL ? `<img src="${p.fotoURL}" alt="${p.nome}">` : ""}
        <h3>${p.nome}</h3>
        <p>R$ ${p.preco}</p>
        <p>${p.descricao}</p>
      </div>`;
      vitrine.innerHTML += card;
    });
  });
}

// Inicializa ao carregar
atualizarTabela();
atualizarVitrine();
