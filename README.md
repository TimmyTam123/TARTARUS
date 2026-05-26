# Tartarus Flask Website

A basic Flask website system with templates and static files.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Open your browser and go to `http://localhost:5000`

## Project Structure

```
.
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── templates/             # HTML templates
│   ├── base.html         # Base template
│   ├── index.html        # Home page
│   └── about.html        # About page
└── static/               # Static files
    └── style.css         # Stylesheet
```

## Routes

- `/` - Home page
- `/about` - About page

## Expanding

To add more pages:
1. Create a new route in `app.py`
2. Create a new HTML template in `templates/`
3. Add navigation links in `base.html`
