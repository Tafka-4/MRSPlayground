import NoticeBox from "./module/notice.js";

const findPasswordInput = {
    id: document.querySelector('input[name="id"]'),
    email: document.querySelector('input[name="email"]'),
};

const findPasswordButton = document.querySelector("#find-password-button");
const goToLoginButton = document.querySelector("#go-to-login");
const findPasswordForm = document.querySelector(".find-password-form");
const successMessage = document.querySelector(".success-message");

findPasswordButton.addEventListener("click", findPassword);
findPasswordButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        findPassword();
    }
});

goToLoginButton.addEventListener("click", () => {
    window.location.href = "/login";
});

findPasswordInput.id.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        findPassword();
    }
});

findPasswordInput.email.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        findPassword();
    }
});

function findPassword() {
    const id = findPasswordInput.id.value.trim();
    const email = findPasswordInput.email.value.trim();

    if (!validateInputs(id, email)) {
        return;
    }

    findPasswordButton.disabled = true;
    findPasswordButton.textContent = "발송 중...";

    fetch("/api/v1/auth/find-password", {
        method: "POST",
        body: JSON.stringify({ id, email }),
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showSuccessMessage();
            } else {
                let notice = new NoticeBox(data.message || "비밀번호 찾기에 실패했습니다.", "error");
                notice.show();
                resetButton();
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            let notice = new NoticeBox(
                "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                "error"
            );
            notice.show();
            resetButton();
        });
}

function validateInputs(id, email) {
    if (id === "") {
        let notice = new NoticeBox("아이디를 입력해주세요.", "error");
        notice.show();
        findPasswordInput.id.focus();
        return false;
    }

    if (id.length < 4) {
        let notice = new NoticeBox("아이디는 4자 이상이어야 합니다.", "error");
        notice.show();
        findPasswordInput.id.focus();
        return false;
    }

    if (id.length > 20) {
        let notice = new NoticeBox("아이디는 20자 이하여야 합니다.", "error");
        notice.show();
        findPasswordInput.id.focus();
        return false;
    }

    if (/[^a-zA-Z0-9_]/g.test(id)) {
        let notice = new NoticeBox(
            "아이디는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.",
            "error"
        );
        notice.show();
        findPasswordInput.id.focus();
        return false;
    }

    if (email === "") {
        let notice = new NoticeBox("이메일을 입력해주세요.", "error");
        notice.show();
        findPasswordInput.email.focus();
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        let notice = new NoticeBox("올바른 이메일 형식을 입력해주세요.", "error");
        notice.show();
        findPasswordInput.email.focus();
        return false;
    }

    if (email.length > 100) {
        let notice = new NoticeBox("이메일은 100자 이하여야 합니다.", "error");
        notice.show();
        findPasswordInput.email.focus();
        return false;
    }

    return true;
}

function showSuccessMessage() {
    findPasswordForm.style.display = "none";
    successMessage.style.display = "block";
    
    setTimeout(() => {
        window.location.href = "/login";
    }, 10000);
}

function resetButton() {
    findPasswordButton.disabled = false;
    findPasswordButton.textContent = "임시 비밀번호 발송";
}

async function checkLoginStatus() {
    const accessToken = localStorage.getItem("accessToken");
    
    if (accessToken) {
        window.location.href = "/";
        return;
    }
    
    try {
        const refreshResponse = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshResponse.ok) {
            const result = await refreshResponse.json();
            if (result.success && result.accessToken) {
                localStorage.setItem('accessToken', result.accessToken);
                window.location.href = "/";
            }
        }
    } catch (error) {
        console.log('토큰 갱신 중 오류 발생:', error);
    }
}

findPasswordInput.id.addEventListener("input", () => {
    const username = findPasswordInput.id.value;
    if (username.length > 0 && /[^a-zA-Z0-9_]/g.test(username)) {
        findPasswordInput.id.style.borderColor = "#ff6b6b";
    } else {
        findPasswordInput.id.style.borderColor = "";
    }
});

findPasswordInput.email.addEventListener("input", () => {
    const email = findPasswordInput.email.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 0 && !emailRegex.test(email)) {
        findPasswordInput.email.style.borderColor = "#ff6b6b";
    } else {
        findPasswordInput.email.style.borderColor = "";
    }
});

checkLoginStatus(); 