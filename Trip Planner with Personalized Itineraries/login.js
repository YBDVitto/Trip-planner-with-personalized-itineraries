
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Selettori degli elementi della pagina
    const loginBtn = document.getElementById('login-btn');
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const loginTitle = document.querySelector('.login__title');
    const loginEye = document.getElementById("login-eye")


    let visiblePsw = false
    let isRegisterMode = false;

    // Event listener per il pulsante di login/registrazione
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;

        if (isRegisterMode) {
            // Registrazione utente
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    alert(`Registrazione avvenuta con successo! Benvenuto ${userCredential.user.email}`);
                    toggleForms('login'); // Torna alla modalità di login
                })
                .catch((error) => {
                    alert(`Errore: ${error.message}`);
                });
        } else {
            // Login utente
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    alert(`Benvenuto ${userCredential.user.email}`);
                    window.location.href = 'homepage.html'; // Reindirizza alla homepage dopo il login
                })
                .catch((error) => {
                    alert(`Errore: ${error.message}`);
                });
        }
    });

    // Event listener per passare alla modalità di registrazione
    toggleToRegister.addEventListener('click', () => {
        toggleForms('register');
    });

    // Event listener per passare alla modalità di login
    toggleToLogin.addEventListener('click', () => {
        toggleForms('login');
    });

    // Funzione per mostrare/nascondere i form di login e registrazione
    function toggleForms(mode) {
        if (mode === 'register') {
            isRegisterMode = true;
            loginTitle.textContent = 'Register';
            loginBtn.textContent = 'Register';
            toggleToLogin.style.display = 'inline';
            toggleToRegister.style.display = 'none';
        } else {
            isRegisterMode = false;
            loginTitle.textContent = 'Login';
            loginBtn.textContent = 'Login';
            toggleToLogin.style.display = 'none';
            toggleToRegister.style.display = 'inline';
        }
    }
    const forgotPasswordLink = document.getElementById("forgot-password");


    forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault(); // Evita il comportamento predefinito del link

    // Chiedi all'utente di inserire l'email per il reset della password
    const email = prompt("Please enter your email to reset your password:");

    if (email) {
        sendPasswordResetEmail(auth, email)
        .then(() => {
            alert("Password reset email sent! Check your inbox.");
        })
        .catch((error) => {
            console.error("Error sending password reset email:", error);
            alert("Error: " + error.message);
        });
    }
    });

    loginEye.addEventListener("click", (e) => {
        e.preventDefault()
        const loginPass = document.getElementById("login-pass")
        if(visiblePsw) {
            loginPass.type = "password"
            visiblePsw = false
        } else if(!visiblePsw) {
            loginPass.type = "text"
            visiblePsw = true
        }
    })
});
