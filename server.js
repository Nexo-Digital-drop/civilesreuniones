const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const PORT = process.env.PORT || 4000;

const publicPath = path.join(__dirname, 'public');

// ----- Configuración de subida de imágenes -----
// ANTES: const uploadsDir = path.join(__dirname, 'uploads');
const uploadsDir = path.join(publicPath, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({ storage });

// ----- Middlewares -----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (incluye /uploads)
// Servir archivos estáticos desde /public
app.use(express.static(publicPath));


// Helpers para products.json
const PRODUCTS_PATH = path.join(__dirname, 'products.json');

function readProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_PATH)) return [];
    const data = fs.readFileSync(PRODUCTS_PATH, 'utf8');
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Error leyendo products.json:', err);
    return [];
  }
}

function writeProducts(products) {
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), 'utf8');
}

// ----- Rutas de páginas -----
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public' , 'index.html'));
});

app.get('/admin', (req, res) => {
   res.sendFile(path.join(__dirname, 'public', 'admin-catalogo.html'));
});

// ----- API de productos -----

// Obtener todos
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// Crear producto (con imagen opcional)
app.post('/api/products', upload.single('imageFile'), (req, res) => {
  try {
    const { name, description, price, category, power, imageUrl } = req.body;

    const products = readProducts();

    // Si subió archivo usamos la ruta de /uploads, si no, usamos el imageUrl de texto
    let finalImageUrl = imageUrl || '';
    if (req.file) {
      finalImageUrl = `uploads/${req.file.filename}`;
    }

    const newProduct = {
      id: Date.now(),
      name: name || '',
      description: description || '',
      price: price || '',
      category: category || '',
      power: power || '',
      imageUrl: finalImageUrl
    };

    products.push(newProduct);
    writeProducts(products);

    res.status(201).json({
      message: 'Producto creado correctamente',
      product: newProduct
    });
  } catch (err) {
    console.error('Error creando producto:', err);
    res.status(500).json({ message: 'Error creando producto' });
  }
});

// Eliminar producto
app.delete('/api/products/:id', (req, res) => {
  try {
    const idParam = req.params.id;
    const numericId = Number(idParam);

    const products = readProducts();

    let index = products.findIndex(p => p.id === numericId);

    if (index === -1 && !Number.isNaN(numericId) && products[numericId]) {
      index = numericId;
    }

    if (index === -1) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    products.splice(index, 1);
    writeProducts(products);

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    res.status(500).json({ message: 'Error eliminando producto' });
  }
});

// ----- Arrancar servidor -----
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
