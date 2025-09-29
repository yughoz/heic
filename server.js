import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(helmet());
app.use(morgan('tiny'));

const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES) || 50 * 1024 * 1024; // 50MB
const JPEG_QUALITY = Number(process.env.JPEG_QUALITY) || 90;

// multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

function isHeic(mimetype, originalname) {
  const lower = (mimetype || '').toLowerCase();
  const name = (originalname || '').toLowerCase();
  return (
    lower === 'image/heic' ||
    lower === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

app.get('/', (req, res) => {
  res.type('text').send('heic-to-jpg-api: POST /convert with form field `image` (multipart/form-data)');
});

// Convert uploaded file buffer to JPEG
app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use form field `image`.' });

    if (!isHeic(req.file.mimetype, req.file.originalname)) {
      console.log('Uploaded non-HEIC file:', req.file.mimetype, req.file.originalname);
    }

    const image = sharp(req.file.buffer, { failOnError: false });
    const metadata = await image.metadata();

    let pipeline = image;
    if (metadata.orientation) pipeline = pipeline.rotate();
    if (metadata.hasAlpha) pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });

    const outputBuffer = await pipeline
      .jpeg({ quality: JPEG_QUALITY, chromaSubsampling: '4:4:4' })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.send(outputBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Conversion failed', message: err.message });
  }
});

// Convert from URL
app.post('/convert-url', express.json(), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing `url` in JSON body' });

    const resp = await fetch(url, { timeout: 15000 });
    if (!resp.ok) return res.status(400).json({ error: 'Failed to fetch URL', status: resp.status });

    const buffer = Buffer.from(await resp.arrayBuffer());
    const image = sharp(buffer, { failOnError: false });
    const metadata = await image.metadata();

    let pipeline = image;
    if (metadata.orientation) pipeline = pipeline.rotate();
    if (metadata.hasAlpha) pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });

    const outputBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.send(outputBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Conversion failed', message: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  next(err);
});

app.listen(PORT, () => console.log(`heic-to-jpg-api listening on port ${PORT}`));
