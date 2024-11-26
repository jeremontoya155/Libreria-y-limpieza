const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Cargar variables de entorno
dotenv.config();

// Configuración del servidor y la base de datos
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.set('view engine', 'ejs'); // Configuración del motor de vistas EJS
app.use(bodyParser.urlencoded({ extended: true })); // Middleware para procesar formularios
app.use(session({
    secret: process.env.SESSION_SECRET || 'mysecretkey',
    resave: false,
    saveUninitialized: false,
}));

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login'); // Redirigir a la página de login
}

// Middleware para verificar si el usuario es admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/user'); // Redirigir a la vista de usuario
}

// Importar las rutas
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// Configuración de rutas
app.use('/auth', authRoutes);
app.use('/admin', isAuthenticated, isAdmin, adminRoutes);
app.use('/user', isAuthenticated, userRoutes);

// Ruta principal
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/user');
    }
    res.redirect('/auth/login');
});

// Redirección desde /login a /auth/login
app.get('/login', (req, res) => {
    res.redirect('/auth/login');
});

// Puerto de la aplicación
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
