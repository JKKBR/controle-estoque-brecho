// Importações do Firebase SDK modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } 
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } 
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2YRYmavqayWalx2ax9JdGWVIHgAxi1RE",
  authDomain: "brecho-logistica.firebaseapp.com",
  projectId: "brecho-logistica",
  storageBucket: "brecho-logistica.appspot.com", // corrigido
  messagingSenderId: "673397280509",
  appId: "1:673397280509:web:058666b2a2be125c30f894",
  measurementId: "G-ER0MEWN9DY"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Função para traduzir erros
function traduzErro(err) {
  switch (err.code) {
    case "auth/invalid-email": return "Formato de email inválido.";
    case "auth/user-not-found": return "Usuário não encontrado.";
    case "auth/wrong-password": return "Senha incorreta.";
    case "auth/email-already-in-use": return "Este email já está em uso.";
    case "auth/weak-password": return "Senha muito fraca. Use pelo menos 6 caracteres.";
    case "auth/too-many-requests": return "Muitas tentativas. Aguarde alguns minutos.";
    default: return "Erro: " + err.message;
  }
}

// Função para mostrar mensagens visuais
function mostrarMensagem(id, texto, tipo="erro") {
  const div = document.getElementById(id);
  div.className = "mensagem " + tipo;
  div.textContent = texto;
}

// Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;
  try {
    await signInWithEmailAndPassword(auth, email, senha);
    document.getElementById("loginArea").style.display = "none";
    document.getElementById("painel").style.display = "block";
  } catch (err) {
    mostrarMensagem("loginMsg", traduzErro(err), "erro");
  }
});

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  document.getElementById("painel").style.display = "none";
  document.getElementById("loginArea").style.display = "block";
  mostrarMensagem("loginMsg", "Você saiu da conta.", "sucesso");
});

// Cadastro de novos usuários
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoEmail = document.getElementById("novoEmail").value;
  const novaSenha = document.getElementById("novaSenha").value;
  try {
    await createUserWithEmailAndPassword(auth, novoEmail, novaSenha);
    mostrarMensagem("registerMsg", "Novo usuário cadastrado com sucesso!", "sucesso");
    document.getElementById("registerForm").reset();
  } catch (err) {
    mostrarMensagem("registerMsg", traduzErro(err), "erro");
  }
});

// Cadastro de produtos
document.getElementById("productForm").addEventListener("submit", async (e) => {
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
  try {
    await addDoc(collection(db, "produtos"), { nome, quantidade, estado, preco, qualidade, descricao, fotoURL });
    mostrarMensagem("productMsg", "Produto cadastrado com sucesso!", "sucesso");
    document.getElementById("productForm").reset();
  } catch (err) {
    mostrarMensagem("productMsg", "Erro ao salvar produto: " + err.message, "erro");
  }
});

// Atualiza tabela administrativa
const tbody = document.querySelector("#productTable tbody");
onSnapshot(collection(db, "produtos"), (snapshot) => {
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

// Atualiza vitrine pública
const vitrine = document.getElementById("vitrine");
onSnapshot(collection(db, "produtos"), (snapshot) => {
  vitrine.innerHTML = "";
  snapshot.forEach(doc => {
    const p = doc.data();
    const card = `<div class="card">
      ${p.fotoURL ? `<img src="${p.fotoURL}" alt="${p.nome}">` : ""}
      <h3>${p.nome}</h3>
      <p><strong>Preço:</strong> R$ ${p.preco}</p>
      <p>${p.descricao}</p>
    </div>`;
    vitrine.innerHTML += card;
  });
});
