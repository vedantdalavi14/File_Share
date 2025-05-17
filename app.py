from flask import Flask, render_template, request, redirect, url_for, send_from_directory, flash
import os
import uuid
import qrcode
from io import BytesIO
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file selected')
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        flash('No file selected')
        return redirect(request.url)
    if file and allowed_file(file.filename):
        try:
            file_id = str(uuid.uuid4())
            filename = file_id + '_' + file.filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            share_url = request.url_root + 'download/' + file_id
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(share_url)
            qr.make(fit=True)
            img = qr.make_image(fill='black', back_color='white')
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            qr_img = base64.b64encode(buffered.getvalue()).decode()
            return render_template('share.html', share_url=share_url, qr_code=qr_img, filename=file.filename)
        except Exception as e:
            flash('Error uploading file')
            return redirect(request.url)
    flash('Invalid file type')
    return redirect(request.url)

@app.route('/download/<file_id>')
def download_file(file_id):
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        if filename.startswith(file_id):
            original_filename = filename[len(file_id)+1:]
            return render_template('download.html', filename=original_filename, filepath=filename)
    return "File not found", 404

@app.route('/download_file/<filename>')
def download(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 