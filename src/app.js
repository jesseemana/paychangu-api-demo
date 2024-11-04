import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import axios from './axios.js'
import { v4 as uuidv4 } from 'uuid'
import { Product, connect_db } from './database.js'

const app = express()

const PORT = parseInt(process.env.PORT) || 9000

// Middleware 
app.use(cors())
app.use(helmet())
app.use(express.json())

// Check Application Health 
app.get('/health', (_req, res) => {
    res.status(200).json({ msg: 'Health OK' })
})

// Get All Products From DB 
app.get('/api/products', async (_req, res) => {
    const products = await Product.find({})
    res.status(200).json(products)
})

// Initiate Payment On Paychangu 
// TODO: sanitize incoming data 
app.post('/api/checkout', async (req, res) => {
    const { first_name, last_name, email, amount } = req.body

    // Create payload to be sent to the API 
    const payload = {
        first_name,
        last_name,
        amount,
        email,
        customization: { 
            title: 'Online Purchase', 
            description: 'Purchase from website', 
        },
        currency: 'MWK',
        tx_ref: uuidv4(),
        return_url: process.env.RETURN_URL,
        callback_url: process.env.CALLBACK_URL,
    }

    // Send payment request to Paychangu API 
    const response = await axios.post('/payment', JSON.stringify(payload), {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
        }
    })
    const results = response.data
    // TODO: create order in db once payment has been initiated
    res.status(200).json({ 
        tx_ref: payload.tx_ref,
        url: results.data.checkout_url
    })
})

// Verify Your Payment 
app.get('/api/verify/:tx_ref', async (req, res) => {
    const response = await axios.get(`/verify-payment/${req.params.tx_ref}`, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`
        }
    })
    if (response.data.status === 'success') { 
        // TODO: update order status to paid after verifying successful payment
        return res.status(200).json({ msg: 'Payment received' })
    }
    res.status(400).json({ msg: 'Payment not received' })
})

// Asynchronous Error handling Middleware 
app.use((err, req, res, next) => {
    console.error('An error occurred.', err);
    return res.status(500).json({ msg: 'Internal Server Error' });
});

// Main function starting the app 
async function main() {
    connect_db()
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
    })
}

main()
