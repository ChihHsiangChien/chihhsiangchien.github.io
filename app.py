from flask import Flask, send_from_directory
import ssl
import os

app = Flask(__name__)

# 根目錄提供 index.html
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# 讓 Flask 支援所有子資料夾裡的檔案
@app.route('/<path:filename>')
def serve_file(filename):
    # 假設你有子資料夾 (如: subfolder, assets)
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    else:
        return "File not found", 404

if __name__ == '__main__':
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')
    app.run(host='0.0.0.0', port=5000, ssl_context=context)
