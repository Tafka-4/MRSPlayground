import NoticeBox from "./module/notice.js";

const loginInput = {
    username: document.querySelector('input[name="username"]'),
    password: document.querySelector('input[name="password"]'),
};

const loginButton = document.querySelector("#login-button");
const rememberMeCheckbox = document.querySelector("#remember-me");
const visibilityIcon = document.querySelector("#visibility");
const visibilityOffIcon = document.querySelector("#visibility-off");

rememberMeCheckbox.addEventListener("click", rememberMe);
visibilityIcon.addEventListener("click", togglePasswordVisibility);
visibilityOffIcon.addEventListener("click", togglePasswordVisibility);

visibilityOffIcon.style.display = "none";

function togglePasswordVisibility() {
    const passwordInput = loginInput.password;
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        visibilityIcon.style.display = "none";
        visibilityOffIcon.style.display = "block";
    } else {
        passwordInput.type = "password";
        visibilityIcon.style.display = "block";
        visibilityOffIcon.style.display = "none";
    }
}

loginButton.addEventListener("click", login);
loginButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        login();
    }
});

function login() {
    const username = loginInput.username.value;
    const password = loginInput.password.value;

    if (username === "" || password === "") {
        let notice = new NoticeBox(
            "아이디와 비밀번호를 입력해주세요.",
            "error"
        );
        notice.show();
        return;
    }
    if (password.length < 8) {
        let notice = new NoticeBox(
            "비밀번호는 8자 이상이어야 합니다.",
            "error"
        );
        notice.show();
        return;
    }
    if (password.length > 16) {
        let notice = new NoticeBox("비밀번호는 16자 이하여야 합니다.", "error");
        notice.show();
        return;
    }
    if (/[^a-zA-Z0-9!@#$%^&*()_]/g.test(username)) {
        let notice = new NoticeBox(
            "아이디는 영문자, 숫자, 특수문자만 사용할 수 있습니다.",
            "error"
        );
        notice.show();
        return;
    }
    if (
        !password.match(/[a-zA-Z]/g) ||
        !password.match(/[0-9]/g) ||
        !password.match(/[!@#$%^&*()_]/g)
    ) {
        let notice = new NoticeBox(
            "비밀번호는 영문자, 숫자, 특수문자를 포함해야 합니다.",
            "error"
        );
        notice.show();
        return;
    }

    fetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                localStorage.setItem("accessToken", data.accessToken);
                cookies.set("refreshToken", data.refreshToken, {
                    path: "/",
                    maxAge: 60 * 60 * 24 * 7,
                    httpOnly: true,
                    secure: true,
                    sameSite: "strict",
                });
                const redirectUrl = new URLSearchParams(
                    window.location.search
                ).get("redirect");
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = "/";
                }
            } else {
                let notice = new NoticeBox(data.message, "error");
                notice.show();
                document.querySelector('input[name="password"]').value = "";
            }
        })
        .catch((error) => {
            let notice = new NoticeBox(
                "로그인 중 오류가 발생했습니다.",
                "error"
            );
            notice.show();
        });
}

function rememberMe() {
    if (rememberMeCheckbox.checked) {
        localStorage.setItem("username", loginInput.username.value);
    } else {
        localStorage.removeItem("username");
    }
}

function checkLogin() {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    const redirectUrl = new URLSearchParams(window.location.search).get(
        "redirect"
    );
    if (redirectUrl) {
        window.location.href = redirectUrl;
    } else {
        window.location.href = "/";
    }
}

function checkRememberMe() {
    const rememberUsername = localStorage.getItem("username");
    if (rememberUsername) {
        loginInput.username.value = rememberUsername;
        rememberMeCheckbox.checked = true;
    }
}

checkLogin();
checkRememberMe();
