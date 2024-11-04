import mongoose from 'mongoose'

// Connecting to database 
export async function connect_db() {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING, 
            { dbName: 'store' }
        )
        console.log('Database connected.')
    } catch (err) {
        console.error('Failed to connect database.', err)
    }
}

// Setup Products schema 
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
})

// Create Products Model 
export const Product = mongoose.model('Product', productSchema)
