import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import axios from './axios.js'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = process.env.PORT || 9000

// TODO: create orders model
const productSchema = new mongoose.Schema({
    image: { type: String },
    name: { type: String },
    price: { type: Number },
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

app.use(express.json())

app.get('/api/products', async (_req, res) => {
    try {
        const products = await Product.find({})
        res.status(200).json(products)
    } catch (error) {
        console.error(`An error occured. ${error}`)
        return res.status(500).json({ msg: 'Internal Server Error' })
    }
})

app.post('/api/checkout', async (req, res) => {
    try {
        const payload = {
            ...req.body,
            customization: { 
                title: 'Online Purchase', 
                description: 'Purchase from website', 
            },
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
        res.json({ url: results.data.checkout_url })
    } catch (error) {
        console.error(`An error occured. ${error}`);
        return res.status(500).json({ msg: 'Internal Server Error' })
    }
})

app.get('/api/verify/:tx_ref', async (req, res) => {
    try {
        const { tx_ref } = req.params
        const response = await axios.get(`/verify-payment/${tx_ref}`, {
            headers: {
                Accept: application/json,
                Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`
            }
        })
        res.json(response.data)
        if (response.data) {
            // do stuff here, update order in db, etc
        }
    } catch (error) {
        console.error(`An error occured. ${error}`);
        return res.status(500).json({ msg: 'Internal Server Error' })
    }
})

async function main() {
    connect_db()
    app.listen(PORT, () => {
        console.log(`server running on http://localhost:${PORT}`)
    })
}

main()
