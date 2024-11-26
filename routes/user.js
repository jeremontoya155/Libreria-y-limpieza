const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Configurar la conexión a PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ruta para mostrar el catálogo de productos
router.get('/catalog', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');
        res.render('user_catalog', { products: result.rows, user: req.session.user });
    } catch (error) {
        console.error('Error al cargar el catálogo de productos:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Ruta para crear un pedido
router.post('/orders', async (req, res) => {
    const { branch_id, items } = req.body; // items es un array con { codebar, quantity }

    try {
        // Crear el pedido
        const result = await pool.query(
            'INSERT INTO orders (branch_id) VALUES ($1) RETURNING id',
            [branch_id]
        );
        const orderId = result.rows[0].id;

        // Insertar los productos seleccionados en el pedido
        const queries = items.map(item => {
            const { codebar, quantity } = item;
            return pool.query(
                'INSERT INTO order_items (order_id, codebar, quantity) VALUES ($1, $2, $3)',
                [orderId, codebar, parseInt(quantity, 10)]
            );
        });

        await Promise.all(queries);

        res.redirect('/user/orders');
    } catch (error) {
        console.error('Error al crear el pedido:', error);
        res.status(500).send('Error interno del servidor.');
    }
});



// Ruta para mostrar los pedidos realizados por la sucursal
router.get('/orders', async (req, res) => {
    const branchId = req.session.user.branch_id; // Asumiendo que el ID de la sucursal está en la sesión
    try {
        const result = await pool.query(`
            SELECT orders.id AS order_id, orders.created_at,
                   order_items.product_id, order_items.quantity, 
                   products.name AS product_name, products.codebar
            FROM orders
            JOIN order_items ON orders.id = order_items.order_id
            JOIN products ON order_items.product_id = products.id
            WHERE orders.branch_id = $1
            ORDER BY orders.created_at DESC
        `, [branchId]);

        res.render('user_orders', { orders: result.rows, user: req.session.user });
    } catch (error) {
        console.error('Error al cargar los pedidos:', error);
        res.status(500).send('Error interno del servidor');
    }
});



module.exports = router;
