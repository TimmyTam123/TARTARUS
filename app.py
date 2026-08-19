import os

from flask import Flask, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder='static')


@app.get('/')
def main():
    return send_from_directory(BASE_DIR, 'main.html')


@app.get('/static/lofi_13.mp4')
def backdrop():
    """Let the browser keep the loop; the code files stay uncached."""
    return send_from_directory(app.static_folder, 'lofi_13.mp4', max_age=86400)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
