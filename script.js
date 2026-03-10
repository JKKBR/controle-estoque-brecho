// Importações do Firebase SDK modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } 
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, getDoc } 
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2YRYmavqayWalx2ax9JdGWVIHgAxi1RE",
  authDomain: "brecho-logistica.firebaseapp.com",
  projectId: "brecho-logistica",
  storageBucket: "brecho-logistica.appspot.com",
  messagingSenderId: "673397280509",
  appId: "1:673397280509:web:058666b2a2be125c30f894",
  measurementId: "G-ER0MEWN9DY"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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

// ----------------------
// Login / Logout
// ----------------------
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

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
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
  try {
    await createUserWithEmailAndPassword(auth, novoEmail, novaSenha);
    mostrarMensagem("registerMsg", "Novo usuário cadastrado com sucesso!", "sucesso");
    document.getElementById("registerForm").reset();
  } catch (err) {
    mostrarMensagem("registerMsg", traduzErro(err), "erro");
  }
});

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
    const storageRef = ref(storage, "produtos/" + Date.now() + "-" + arquivo.name);
    await uploadBytes(storageRef, arquivo);
    fotoURL = await getDownloadURL(storageRef);
  }

  try {
    if (idEdicao) {
      // Atualiza produto existente
      const docRef = doc(db, "produtos", idEdicao);
      await setDoc(docRef, { nome, quantidade, estado, preco, qualidade, descricao, fotoURL }, { merge: true });
      mostrarMensagem("productMsg", "Produto atualizado com sucesso!", "sucesso");
      document.getElementById("productForm").removeAttribute("data-edit-id");
    } else {
      // Novo produto
      await addDoc(collection(db, "produtos"), { nome, quantidade, estado, preco, qualidade, descricao, fotoURL });
      mostrarMensagem("productMsg", "Produto cadastrado com sucesso!", "sucesso");
    }
    document.getElementById("productForm").reset();
  } catch (err) {
    mostrarMensagem("productMsg", "Erro ao salvar produto: " + err.message, "erro");
  }
});

// ----------------------
// Relatório Administrativo com Editar/Excluir
// ----------------------
const tbody = document.querySelector("#productTable tbody");
onSnapshot(collection(db, "produtos"), (snapshot) => {
  tbody.innerHTML = "";
  snapshot.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;
    const row = `<tr>
      <td>${p.nome}</td>
      <td>${p.quantidade}</td>
      <td>${p.estado}</td>
      <td>R$ ${p.preco}</td>
      <td>${p.qualidade}</td>
      <td>
        <button class="editarBtn" data-id="${id}">Editar</button>
        <button class="excluirBtn" data-id="${id}">Excluir</button>
      </td>
    </tr>`;
    tbody.innerHTML += row;
  });

  // Eventos de excluir
  document.querySelectorAll(".excluirBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      try {
        await deleteDoc(doc(db, "produtos", id));
        mostrarMensagem("productMsg", "Produto excluído com sucesso!", "sucesso");
      } catch (err) {
        mostrarMensagem("productMsg", "Erro ao excluir: " + err.message, "erro");
      }
    });
  });

  // Eventos de editar
  document.querySelectorAll(".editarBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const docRef = doc(db, "produtos", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const p = snap.data();
        // Preenche o formulário com os dados atuais
        document.getElementById("nome").value = p.nome;
        document.getElementById("quantidade").value = p.quantidade;
        document.getElementById("estado").value = p.estado;
        document.getElementById("preco").value = p.preco;
        document.getElementById("qualidade").value = p.qualidade;
        document.getElementById("descricao").value = p.descricao || "";
        // Marca que estamos editando
        document.getElementById("productForm").setAttribute("data-edit-id", id);
      }
    });
  });
});

// ----------------------
// Atualiza vitrine pública
// ----------------------
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

// ----------------------
// Banner dinâmico
// ----------------------

// Frases pré-montadas
const frasesPre = [
  "Confira nossas novidades!",
  "Peças únicas esperando por você!",
  "Novidades fresquinhas no brechó!",
  "Garimpe já sua próxima peça favorita!"
];

// Atualiza banner em tempo real
const bannerDiv = document.getElementById("banner");
onSnapshot(doc(db, "config", "banner"), (snapshot) => {
  if (snapshot.exists()) {
    bannerDiv.querySelector("h2").textContent = snapshot.data().texto;
  }
});

// Formulário de banner no painel
document.getElementById("bannerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectFrase = document.getElementById("frasePre").value;
  const fraseCustom = document.getElementById("fraseCustom").value.trim();
  const texto = fraseCustom !== "" ? fraseCustom : selectFrase;
  try {
    await setDoc(doc(db, "config", "banner"), { texto });
    mostrarMensagem("bannerMsg", "Banner atualizado com sucesso!", "sucesso");
  } catch (err) {
    mostrarMensagem("bannerMsg", "Erro ao atualizar banner: " + err.message, "erro");
  }
});

// Preenche select com frases pré-montadas
const selectFrase = document.getElementById("frasePre");
frasesPre.forEach(f => {
  const opt = document.createElement("option");
  opt.value = f;
  opt.textContent = f;
  selectFrase.appendChild(opt);
});

// Exibe frase atual no painel
const painelBanner = document.getElementById("painelBanner");
onSnapshot(doc(db, "config", "banner"), (snapshot) => {
  if (snapshot.exists()) {
    painelBanner.textContent = "Frase atual do banner: " + snapshot.data().texto;
  } else {
    painelBanner.textContent = "Nenhuma frase definida ainda.";
  }
});

// Define frase inicial caso não haja nada no Firestore
if (!bannerDiv.querySelector("h2").textContent) {
  bannerDiv.querySelector("h2").textContent = frasesPre[0];
}

// Define frase inicial caso não haja nada no Firestore
if (!bannerDiv.querySelector("h2").textContent) {
  bannerDiv.querySelector("h2").textContent = frasesPre[0];
}

// ----------------------
// Fim do script
// ----------------------
// Agora o sistema está completo:
// - Login e logout
// - Cadastro de usuários
// - CRUD de produtos (cadastrar, editar, excluir)
// - Upload de fotos persistente no Firebase Storage
// - Relatório administrativo com ações
// - Vitrine pública atualizada em tempo real
// - Banner dinâmico configurável com frases pré-montadas ou personalizadas
