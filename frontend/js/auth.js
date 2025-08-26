const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const toggleLink = document.getElementById("toggleLink");
const formTitle = document.getElementById("formTitle");
const toggleText = document.getElementById("toggleText");

let isLogin = true;

// Ensure initial visibility
loginForm.classList.remove("hidden");
registerForm.classList.add("hidden");

// toggle b/n login and register form
toggleLink.addEventListener("click", () => {
  if (isLogin) {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    formTitle.textContent = "Register";
    toggleText.firstChild.textContent = "Already have an account? ";
    toggleLink.textContent = "Login";
  } else {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    formTitle.textContent = "Login";
    toggleText.firstChild.textContent = "Don't have an account? ";
    toggleLink.textContent = "Sign up";
  }
  isLogin = !isLogin;
});
