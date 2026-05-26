from flask import Flask

app = Flask(__name__)

@app.route('/')
def main():
    with open('main.html', 'r') as f:
        return f.read()

@app.route('/active')
def active():
    with open('active.html', 'r') as f:
        return f.read()

if __name__ == '__main__':
    app.run(debug=True)
