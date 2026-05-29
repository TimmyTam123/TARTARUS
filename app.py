import os
from flask import Flask

app = Flask(__name__)
BASE_DIR = os.path.dirname(__file__)

@app.route('/')
def main():
    with open(os.path.join(BASE_DIR, 'main.html'), 'r') as f:
        return f.read()

@app.route('/active')
def active():
    with open(os.path.join(BASE_DIR, 'main.html'), 'r') as f:
        return f.read()

if __name__ == '__main__':
    app.run(debug=True)
