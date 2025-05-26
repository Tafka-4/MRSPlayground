import NoticeBox from "./module/notice.js";

const findPasswordInput = {
    username: document.querySelector('input[name="username"]'),
    email: document.querySelector('input[name="email"]'),
};

const findPasswordButton = document.querySelector("#find-password-button");
const goToLoginButton = document.querySelector("#go-to-login");
const findPasswordForm = document.querySelector(".find-password-form");
const successMessage = document.querySelector(".success-message");

// 이벤트 리스너 등록
findPasswordButton.addEventListener("click", findPassword);
findPasswordButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        findPassword();
    }
});

goToLoginButton.addEventListener("click", () => {
    window.location.href = "/login";
});

// Enter 키로 폼 제출
findPasswordInput.username.addEventListener("keydown", (event) => {
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
    const username = findPasswordInput.username.value.trim();
    const email = findPasswordInput.email.value.trim();

    // 입력값 유효성 검사
    if (!validateInputs(username, email)) {
        return;
    }

    // 버튼 비활성화 및 로딩 상태
    findPasswordButton.disabled = true;
    findPasswordButton.textContent = "발송 중...";

    // API 호출
    fetch("/api/v1/auth/find-password", {
        method: "POST",
        body: JSON.stringify({ username, email }),
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

function validateInputs(username, email) {
    // 아이디 검사
    if (username === "") {
        let notice = new NoticeBox("아이디를 입력해주세요.", "error");
        notice.show();
        findPasswordInput.username.focus();
        return false;
    }

    if (username.length < 4) {
        let notice = new NoticeBox("아이디는 4자 이상이어야 합니다.", "error");
        notice.show();
        findPasswordInput.username.focus();
        return false;
    }

    if (username.length > 20) {
        let notice = new NoticeBox("아이디는 20자 이하여야 합니다.", "error");
        notice.show();
        findPasswordInput.username.focus();
        return false;
    }

    if (/[^a-zA-Z0-9_]/g.test(username)) {
        let notice = new NoticeBox(
            "아이디는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.",
            "error"
        );
        notice.show();
        findPasswordInput.username.focus();
        return false;
    }

    // 이메일 검사
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
    
    // 성공 메시지 표시 후 자동으로 로그인 페이지로 이동 (10초 후)
    setTimeout(() => {
        window.location.href = "/login";
    }, 10000);
}

function resetButton() {
    findPasswordButton.disabled = false;
    findPasswordButton.textContent = "임시 비밀번호 발송";
}

// 페이지 로드 시 로그인 상태 확인
function checkLoginStatus() {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
        // 이미 로그인된 상태라면 메인 페이지로 리다이렉트
        window.location.href = "/";
    }
}

// 입력 필드 실시간 유효성 검사
findPasswordInput.username.addEventListener("input", () => {
    const username = findPasswordInput.username.value;
    if (username.length > 0 && /[^a-zA-Z0-9_]/g.test(username)) {
        findPasswordInput.username.style.borderColor = "#ff6b6b";
    } else {
        findPasswordInput.username.style.borderColor = "";
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

// 페이지 로드 시 실행
checkLoginStatus(); 