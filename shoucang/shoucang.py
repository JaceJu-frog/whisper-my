from flask import Flask, send_from_directory, jsonify, abort
import os

app = Flask(__name__)

# 设定允许访问的根目录（可以是用户文件夹、桌面或其他路径）

# 列出指定目录下的文件和子文件夹
@app.route('/list/<path:subpath>', methods=['GET'])
def list_files(subpath):
    # 拼接完整路径
    full_path = os.path.join(subpath)
    
    if os.path.exists(full_path):
        if os.path.isdir(full_path):
            # 返回目录中的文件和文件夹列表
            return jsonify(os.listdir(full_path))
        else:
            abort(404, description="Not a directory")
    else:
        abort(404, description="Directory does not exist")

# 访问某个文件
@app.route('/file/<path:subpath>', methods=['GET'])
def serve_file(subpath):
    full_path = os.path.dirname(subpath)
    filename = os.path.basename(subpath)

    if os.path.exists(os.path.join(full_path, filename)):
        return send_from_directory(full_path, filename)
    else:
        abort(404, description="File not found")

# 运行 Flask 服务
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
