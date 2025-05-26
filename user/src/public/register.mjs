import NoticeBox from "./module/notice.js";

const registerInput = {
    username: document.querySelector('input[name="username"]'),
    password: document.querySelector('input[name="password"]'),
    passwordConfirm: document.querySelector('input[name="passwordConfirm"]'),
    nickname: document.querySelector('input[name="nickname"]'),
    email: document.querySelector('input[name="email"]'),
    pin: document.querySelector('input[name="pin"]')
};

const registerButton = document.querySelector('#register-form-body-button');
const sendPinButton = document.querySelector('#send-pin-button');
const verifyPinButton = document.querySelector('#verify-pin-button');
const pinInputContainer = document.querySelector('#pin-input-container');
const pinTimerMessage = document.querySelector('#pin-timer-message');

let isEmailVerified = false;
let pinTimerInterval;
let timeLeft = 300;

registerButton.addEventListener('click', register);

registerButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        register();
    }
});

for (const input of Object.values(registerInput)) {
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            register();
        }
    });
}

document.querySelector('input[name="password"]').addEventListener('input', checkPassword);
document.querySelector('input[name="passwordConfirm"]').addEventListener('input', checkPassword);
registerInput.email.addEventListener('input', () => {
    if (registerInput.email.disabled) return;

    isEmailVerified = false;
    pinInputContainer.classList.remove('show');
    clearInterval(pinTimerInterval);
    pinTimerMessage.textContent = '';
    checkEmail();
});

function checkEmail() {
    const email = registerInput.email.value;
    let messageElement = document.querySelector(".password-message-container-message");

    if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.classList.add("password-message-container-message");
        const container = document.querySelector(".password-message-container");
        if (container) {
            container.appendChild(messageElement);
        } else {
            console.error("'.password-message-container' not found.");
            return;
        }
    }

    if (email === "") {
        messageElement.textContent = "";
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(email)) {
        messageElement.textContent = "유효한 이메일 형식입니다.";
        messageElement.style.color = "#4bb92c";
    } else {
        messageElement.textContent = "올바른 이메일 형식이 아닙니다.";
        messageElement.style.color = "#f47c7c";
    }
}

function checkPassword() {
    const password = registerInput.password.value;
    const passwordConfirm = registerInput.passwordConfirm.value;

    let messageElement = document.querySelector(".password-message-container-message");

    if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.classList.add("password-message-container-message");
        document.querySelector(".password-message-container").appendChild(messageElement);
    }

    if (password === "" && passwordConfirm === "") {
        messageElement.textContent = "";
        return;
    }

    if (password !== passwordConfirm) {
        messageElement.textContent = "비밀번호가 일치하지 않습니다.";
        messageElement.style.color = "#f47c7c";
    } else {
        if (password.length > 0 && password.length < 8) {
            messageElement.textContent = "비밀번호는 8자 이상이어야 합니다.";
            messageElement.style.color = "#f47c7c";
        } else if (password.length > 16) {
            messageElement.textContent = "비밀번호는 16자 이하여야 합니다.";
            messageElement.style.color = "#f47c7c";
        } else if (password.length > 0 && (
            !password.match(/[a-zA-Z]/g) ||
            !password.match(/[0-9]/g) ||
            !password.match(/[!@#$%^&*()_]/g)
        )) {
            messageElement.textContent = "비밀번호는 영문자, 숫자, 특수문자를 포함해야 합니다.";
            messageElement.style.color = "#f47c7c";
        } else if (password.length > 0) {
            messageElement.textContent = "비밀번호가 일치합니다!!";
            messageElement.style.color = "#4bb92c";
        } else {
            messageElement.textContent = "";
        }
    }
}

function register() {
    const username = registerInput.username.value;
    const password = registerInput.password.value;
    const passwordConfirm = registerInput.passwordConfirm.value;
    const nickname = registerInput.nickname.value;
    const email = registerInput.email.value;

    if (username === "" || password === "" || passwordConfirm === "" || nickname === "" || email === "") {
        let notice = new NoticeBox(
            "모든 필드를 입력해주세요.",
            "error"
        );
        notice.show();
        return;
    }

    if (password !== passwordConfirm) {
        let notice = new NoticeBox(
            "비밀번호가 일치하지 않습니다.",
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        let notice = new NoticeBox(
            "올바른 이메일 형식이 아닙니다.",
            "error"
        );
        notice.show();
        return;
    }

    if (!isEmailVerified) {
        let notice = new NoticeBox(
            "이메일 인증을 완료해주세요.",
            "error"
        );
        notice.show();
        return;
    }
    
    console.log("회원가입 시도:", { username, password, nickname, email });
    // 예: 
    // fetch('/auth/register', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({ username, password, nickname, email })
    // })
    // .then(response => response.json())
    // .then(data => {
    //     if (data.success) {
    //         new NoticeBox("회원가입 성공!", "success").show();
    //         // 로그인 페이지로 리다이렉트 등
    //     } else {
    //         new NoticeBox(data.message || "회원가입 실패", "error").show();
    //     }
    // })
    // .catch(error => {
    //     console.error('Error:', error);
    //     new NoticeBox("요청 처리 중 오류 발생", "error").show();
    // });
}

sendPinButton.addEventListener('click', async () => {
    const email = registerInput.email.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        // checkEmail 함수가 이미 메시지를 표시하므로, NoticeBox는 중복될 수 있음.
        // 여기서는 NoticeBox 대신 기존 메시지 영역을 활용하거나, checkEmail을 먼저 실행시키는 것을 고려.
        // checkEmail(); // checkEmail이 메시지를 업데이트 하도록 함
        let notice = new NoticeBox("올바른 이메일 형식이 아닙니다.", "error");
        notice.show();
        return;
    }

    // API 호출 시뮬레이션 (인증번호 발송)
    sendPinButton.disabled = true;
    sendPinButton.textContent = '전송 중...';
    pinTimerMessage.textContent = '';

    try {
        // 가상 API 호출: 실제로는 fetch 사용
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 딜레이
        console.log(`인증번호 발송 요청: ${email}`);
        // 가상 성공 응답
        
        pinInputContainer.classList.add('show');
        registerInput.pin.value = ''; // PIN 입력 필드 초기화
        startPinTimer();
        sendPinButton.textContent = '재전송';
        let notice = new NoticeBox("인증번호가 발송되었습니다. 이메일을 확인해주세요.", "info");
        notice.show();

    } catch (error) {
        console.error("인증번호 발송 실패:", error);
        let notice = new NoticeBox("인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
        notice.show();
        sendPinButton.textContent = '인증번호 받기';
    } finally {
        sendPinButton.disabled = false;
    }
});

verifyPinButton.addEventListener('click', async () => {
    const email = registerInput.email.value;
    const pin = registerInput.pin.value;

    if (!pin || pin.length !== 6) {
        let notice = new NoticeBox("인증번호 6자리를 정확히 입력해주세요.", "error");
        notice.show();
        pinTimerMessage.textContent = "인증번호 6자리를 정확히 입력해주세요.";
        pinTimerMessage.style.color = "#f47c7c";
        return;
    }

    // API 호출 시뮬레이션 (PIN 검증)
    verifyPinButton.disabled = true;
    verifyPinButton.textContent = '확인 중...';

    try {
        // 가상 API 호출: 실제로는 fetch 사용
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 딜레이
        console.log(`PIN 검증 요청: ${email}, PIN: ${pin}`);
        // 가상 성공 응답 (실제로는 API 응답에 따라 처리)
        // 예시: if (pin === "123456") { // 실제로는 서버에서 검증
        isEmailVerified = true;
        clearInterval(pinTimerInterval);
        pinTimerMessage.textContent = "이메일 인증이 완료되었습니다.";
        pinTimerMessage.style.color = "#4bb92c";
        pinInputContainer.classList.remove('show'); // 인증 성공 시 PIN 입력창 숨김
        registerInput.email.disabled = true; // 이메일 필드 비활성화
        sendPinButton.disabled = true; // 인증번호 받기 버튼 비활성화
        sendPinButton.textContent = '인증 완료'; // 버튼 텍스트 변경
        let notice = new NoticeBox("이메일 인증이 완료되었습니다.", "success");
        notice.show();
        // } else {
        //     isEmailVerified = false;
        //     pinTimerMessage.textContent = "인증번호가 올바르지 않습니다.";
        //     pinTimerMessage.style.color = "#f47c7c";
        //     let notice = new NoticeBox("인증번호가 올바르지 않습니다.", "error");
        //     notice.show();
        // }
    } catch (error) {
        console.error("PIN 검증 실패:", error);
        pinTimerMessage.textContent = "인증번호 확인에 실패했습니다. 다시 시도해주세요.";
        pinTimerMessage.style.color = "#f47c7c";
        let notice = new NoticeBox("인증번호 확인에 실패했습니다.", "error");
        notice.show();
    } finally {
        verifyPinButton.disabled = false;
        verifyPinButton.textContent = '인증 확인';
    }
});

function startPinTimer() {
    clearInterval(pinTimerInterval);
    timeLeft = 300;
    pinTimerMessage.style.color = "rgb(100,100,100)";

    pinTimerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        pinTimerMessage.textContent = `남은 시간: ${minutes}:${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(pinTimerInterval);
            pinTimerMessage.textContent = "인증 시간이 만료되었습니다. 다시 시도해주세요.";
            pinTimerMessage.style.color = "#f47c7c";
            sendPinButton.textContent = '인증번호 받기';
        }
        timeLeft--;
    }, 1000);
}