# File Share

A simple and secure file sharing application built with Flask that allows users to upload files and share them via unique URLs and QR codes.

## Features

- File upload with size limit (16MB)
- Secure file sharing with unique URLs
- QR code generation for easy sharing
- Support for multiple file types (txt, pdf, png, jpg, jpeg, gif, doc, docx)
- Simple and intuitive user interface

## Installation

1. Clone the repository:
```bash
git clone https://github.com/vedantdalavi14/File_Share.git
cd File_Share
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory and add your secret key:
```
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
```

5. Run the application:
```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Usage

1. Open the application in your web browser
2. Click "Choose File" to select a file to upload
3. Click "Upload" to share the file
4. Share the generated URL or scan the QR code to access the file

## Security

- Files are stored with unique identifiers
- File type validation is implemented
- Maximum file size limit is enforced
- Secure file download mechanism

## License

MIT License

## Author

Vedant Dalavi 