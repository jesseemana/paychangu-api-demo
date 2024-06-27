import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import axios from './axios.js'
import cors from 'cors'
import helmet from 'helmet'
import { v4 as uuidv4 } from 'uuid'

const app = express()

const PORT = process.env.PORT || 9000

// TODO: create orders model
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
})

const Product = mongoose.model('Product', productSchema)

async function connect_db() {
    try {
        await mongoose.connect(
            process.env.CONNECTION_STRING, 
            { dbName: 'store' }
        )
        console.log('Database connected.')
    } catch (error) {
        console.error(`Failed to connect database. ${error}`)
    }
}

app.use(cors())
app.use(helmet())
app.use(express.json())

app.get('/health', (_req, res) => res.status(200).json({ msg: 'Health OK' }))

app.get('/api/products', async (_req, res) => {
    const products = await Product.find({})
    res.status(200).json(products)
})

// TODO: sanitize incoming data 
app.post('/api/checkout', async (req, res) => {
    const { first_name, last_name, email, amount } = req.body
    const payload = {
        amount,
        email,
        first_name,
        last_name,
        customization: { 
            title: 'Online Purchase', 
            description: 'Purchase from website', 
        },
        currency: 'MWK',
        tx_ref: uuidv4(),
        callback_url: process.env.CALLBACK_URL,
        return_url: process.env.RETURN_URL,
    }
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

app.get('/api/verify/:tx_ref', async (req, res) => {
    const { tx_ref } = req.params
    const response = await axios.get(`/verify-payment/${tx_ref}`, {
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

app.use((err, req, res, next) => {
    console.error(`An error occured. ${err}`);
    return res.status(500).json({ msg: 'Internal Server Error' });
});

async function main() {
    connect_db()
    app.listen(PORT, () => {
        console.log(`server running on http://localhost:${PORT}`)
    })
}

main()
