const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth'); 
require('dotenv').config();
const OpenAI = require('openai');



const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
if (!req.file) {
    return res.status(400).send('No file uploaded.');
}
    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    try {
        let extractedText = '';
        if (fileType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            extractedText = pdfData.text;

        } else if (fileType.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            extractedText = text;

        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') {
            const data = await mammoth.extractRawText({ path: filePath });
            extractedText = data.value;

        } else {
            return res.status(400).json({ message: 'Unsupported file type' });
        }

        const openaiResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [
                { role: "system", content: "You are an AI that extracts data from purchase orders." },
                { role: "user", content: `Extract the following details from this purchase order: PO number, item names, quantity, and item price.\n\n${extractedText}` }
            ],
            temperature: 0.3,
            max_tokens: 200,
        });

        const parsedPO = parsePOData(openaiResponse.choices[0].message.content);
        res.json(parsedPO);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Failed to process the file.');
    }
});


function parsePOData(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');

    let poNumber = '';
    const details = [];
    let currentItem = {};

    lines.forEach(line => {
        if (line.startsWith('PO number:')) {
            poNumber = line.split(': ')[1].trim();
        } else if (/^\d+\./.test(line)) {
            if (Object.keys(currentItem).length) {
                details.push(currentItem); 
            }
            currentItem = { 'name': line.replace(/^\d+\./, '').trim() };  
        } else if (line.includes('Quantity:')) {
            currentItem['Quantity'] = parseInt(line.split(': ')[1].trim());
        } else if (line.includes('Price:') || line.includes('Item price:')) {
            currentItem['Price'] = line.split(': ')[1].trim();
        }
    });
    if (Object.keys(currentItem).length) {
        details.push(currentItem);
    }

    return {
        po_number: poNumber || 'Unknown',
        details: details
    };
}


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
