// Affine Cipher 加密和解密
function modInverse(a, m) {
    // 計算a在模m下的乘法反元素
    for (let x = 1; x < m; x++) {
        if ((a * x) % m === 1) {
            return x;
        }
    }
    return 1;
}

function isCoprime(a, b) {
    // 判斷a和b是否互質
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a === 1;
}

function encrypt() {
    const plaintext = document.getElementById('plaintext').value.toUpperCase();
    const a = parseInt(document.getElementById('a').value);
    const b = parseInt(document.getElementById('b').value);
    const encryptResultElement = document.getElementById('encryptResult');

    if (!isCoprime(a, 26)) {
        alert('注意：a需與26互質，請重新輸入。');
        return;
    }

    let ciphertext = '';

    for (let i = 0; i < plaintext.length; i++) {
        const charCode = plaintext.charCodeAt(i);

        if (charCode >= 65 && charCode <= 90) {
            const encryptedCharCode = (a * (charCode-65) + b) % 26 + 65;
            ciphertext += String.fromCharCode(encryptedCharCode);
        } else {
            ciphertext += plaintext[i];
        }
    }

    const c = modInverse(a, 26);
    const d = (26 - b) % 26;

    encryptResultElement.innerHTML = `加密結果：${ciphertext}<br>\
                                      解密參數：<br>c=${c}, d=${d}<br>\
                                      <button onclick="sendToDecrypt('${ciphertext}',${c},${d})">傳送</button>`;

}
function decrypt() {
    const ciphertext = document.getElementById('ciphertext').value.toUpperCase();
    const c = parseInt(document.getElementById('c').value);
    const d = parseInt(document.getElementById('d').value);
    const decryptResultElement = document.getElementById('decryptResult');



    let plaintext = '';

    for (let i = 0; i < ciphertext.length; i++) {
        const charCode = ciphertext.charCodeAt(i);

        if (charCode >= 65 && charCode <= 90) {
            const decryptedCharCode = (c * ((charCode - 65) + d + 26)) % 26 + 65;
            plaintext += String.fromCharCode(decryptedCharCode);
        } else {
            plaintext += ciphertext[i];
        }
    }

    decryptResultElement.textContent = `解密結果：${plaintext}`;
}

function sendToDecrypt(ciphertext,c,d) {

    document.getElementById('ciphertext').value = ciphertext;
    document.getElementById('c').value = c;
    document.getElementById('d').value = d;


}
