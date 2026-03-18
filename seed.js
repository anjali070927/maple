require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define Mongoose Schema and Model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    owner_name: { type: String, required: true },
    flat_number: { type: String, required: true },
    mobile_number: { type: String, required: true },
    email: { type: String },
    password: { type: String, required: true },
    wing: { type: String, default: 'A' },
    floor_number: { type: Number },
    ownership_type: { type: String, enum: ['Owner', 'Tenant'], default: 'Owner' },
    move_in_date: { type: Date },
    role: { type: String, enum: ['Admin', 'User'], default: 'User' },
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'flat_owners');

async function seedDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/maple_apartments';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB successfully.');

        // Clear existing data to ensure clean state
        await User.deleteMany({});
        console.log('Cleared existing database.');

        console.log('Generating credentials for 16 flats...');
        
        const usersToInsert = [];

        // 1. Generate 16 Regular Users (Flats 101-104, ..., 401-404)
        for (let floor = 1; floor <= 4; floor++) {
            for (let flat = 1; flat <= 4; flat++) {
                let flatNum = (floor * 100) + flat;
                let username = 'user' + flatNum;
                let passwordPlain = 'pass' + flatNum;
                let hashedPassword = await bcrypt.hash(passwordPlain, 10);

                usersToInsert.push({
                    username: username,
                    owner_name: 'Owner ' + flatNum,
                    flat_number: flatNum.toString(),
                    mobile_number: '9876543' + flatNum,
                    email: 'flat' + flatNum + '@maple.com',
                    password: hashedPassword,
                    wing: 'A',
                    floor_number: floor,
                    ownership_type: 'Owner',
                    move_in_date: new Date('2026-03-01'),
                    role: 'User'
                });
            }
        }

        // 2. Admin User
        const adminPasswordPlain = 'admin2026';
        const adminHashed = await bcrypt.hash(adminPasswordPlain, 10);
        
        usersToInsert.push({
            username: 'admin',
            owner_name: 'System Admin',
            flat_number: 'ADM',
            mobile_number: '9999999999',
            email: 'admin@maple.com',
            password: adminHashed,
            wing: 'A',
            floor_number: 1,
            ownership_type: 'Owner',
            move_in_date: new Date('2026-03-01'),
            role: 'Admin'
        });

        await User.insertMany(usersToInsert);
        console.log('✅ 16 Flats + Admin inserted successfully into MongoDB!');

    } catch (error) {
        console.error('❌ Expected Error inserting to Database:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seedDatabase();
