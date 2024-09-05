# 开一个后端，接收绝对路径，传递文件信息。
import socket
from flask import Flask, request, jsonify

app = Flask(__name__)

# 定义接口
@app.route('/process', methods=['POST'])
def process_file():
    file_path = request.json.get('file_path')
    try:
        with open(file_path, 'r') as file:
            content = file.read()
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    return jsonify({
        "file_path": file_path,
        "content": content
    })

# 动态选择端口，避开已占用端口
def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

if __name__ == '__main__':
    port = find_free_port()  # 找到一个未占用的端口
    with open("flask_port.txt", "w") as f:
        f.write(str(port))
    print(f"Flask running on port {port}")
    app.run(host='0.0.0.0', port=port)




# 前端调用示例
"""

fetch('http://localhost:5000/process', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        file_path: '/path/to/your/file.txt'
    })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
"""