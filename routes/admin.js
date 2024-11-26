const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Configurar la conexión a PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ruta para mostrar el panel principal del admin
router.get('/', (req, res) => {
    res.render('admin', { user: req.session.user });
});

// Ruta para mostrar y gestionar productos
router.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');
        res.render('admin_products', { products: result.rows });
    } catch (error) {
        console.error('Error al cargar productos:', error);
        res.status(500).send('Error interno del servidor');
    }
});

router.post('/products', async (req, res) => {
    const { IDProducto, codebar, name, description, price, stock } = req.body;

    try {
        // Generar un IDProducto numérico único si no se proporciona
        const finalIDProducto = IDProducto && IDProducto.trim() !== '' 
            ? parseInt(IDProducto.trim(), 10) 
            : Date.now(); // Usar timestamp como valor único

        // Insertar el producto en la base de datos
        await pool.query(
            `INSERT INTO products (IDProducto, codebar, name, description, price, stock) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [finalIDProducto, codebar.trim(), name.trim(), description.trim(), parseFloat(price), parseInt(stock, 10)]
        );

        res.redirect('/admin/products');
    } catch (error) {
        if (error.code === '23505') { // Error de duplicados
            res.status(400).send('IDProducto o Código de Barras ya existen. Intenta con otro.');
        } else {
            console.error('Error al agregar producto:', error);
            res.status(500).send('Error interno del servidor.');
        }
    }
});


// Ruta para mostrar los pedidos realizados por sucursales
router.get('/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT orders.id AS order_id, orders.created_at, orders.branch_id,
                   order_items.codebar, order_items.quantity,
                   products.name AS product_name, products.description, products.price
            FROM orders
            JOIN order_items ON orders.id = order_items.order_id
            JOIN products ON order_items.codebar = products.codebar
            ORDER BY orders.created_at DESC
        `);

        res.render('admin_orders', { orders: result.rows });
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        res.status(500).send('Error interno del servidor.');
    }
});


module.exports = router;
