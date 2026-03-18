const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Route to serve the main index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB Database connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/maple_apartments';
mongoose.connect(mongoURI)
.then(() => console.log('Connected to MongoDB database successfully'))
.catch(err => console.error('Error connecting to MongoDB database:', err));

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

// Define Bill Schema and Model
const billSchema = new mongoose.Schema({
    flat_number: { type: String, required: true },
    bill_type: { 
        type: String, 
        enum: ['Maintenance', 'Property Tax', 'Lift/Loading/Parking', 'Festive Contribution', 'Others'],
        required: true 
    },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
    due_date: { type: Date, required: true },
    created_at: { type: Date, default: Date.now }
});

const Bill = mongoose.model('Bill', billSchema, 'bills');

// --- Bill API ---

// Admin view: Get all bills
app.get('/api/bills', async (req, res) => {
    try {
        const bills = await Bill.find({});
        res.json(bills);
    } catch (error) {
        console.error('Error fetching all bills:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User view: Get bills for a specific flat
app.get('/api/bills/:flat_number', async (req, res) => {
    try {
        const flat_number = req.params.flat_number;
        const bills = await Bill.find({ flat_number: flat_number });
        res.json(bills);
    } catch (error) {
        console.error(`Error fetching bills for flat ${req.params.flat_number}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin view: Seed bills for all flats
app.post('/api/bills/seed', async (req, res) => {
    try {
        await Bill.deleteMany({}); // Clear existing bills
        const billTypes = ['Maintenance', 'Property Tax', 'Lift/Loading/Parking', 'Festive Contribution', 'Others'];
        const billsToInsert = [];

        for (let floor = 1; floor <= 4; floor++) {
            for (let flat = 1; flat <= 4; flat++) {
                let flatNum = (floor * 100) + flat;
                let dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

                billTypes.forEach(type => {
                    let amount;
                    switch(type) {
                        case 'Maintenance': amount = 2500; break;
                        case 'Property Tax': amount = 5000; break;
                        case 'Lift/Loading/Parking': amount = 500; break;
                        case 'Festive Contribution': amount = 1000; break;
                        case 'Others': amount = 200; break;
                    }

                    billsToInsert.push({
                        flat_number: flatNum.toString(),
                        bill_type: type,
                        amount: amount,
                        status: 'Unpaid',
                        due_date: dueDate
                    });
                });
            }
        }

        await Bill.insertMany(billsToInsert);
        res.json({ message: 'Dummy bills generated successfully for all 16 flats' });
    } catch (error) {
        console.error('Error seeding bills:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Login API ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Ensure minimal information is provided
        if (!username || !password) {
            return res.status(400).json({ error: 'Please submit User ID along with password' });
        }

        // Search by username
        const user = await User.findOne({ username: username });

        if (!user) {
            return res.status(401).json({ error: 'Invalid User ID or password. Please try again.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid User ID or password. Please try again.' });
        }

        // Login successful. Remove sensitive info before sending
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ message: 'Login successful', user: userResponse });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Register / Setup API (For Testing) ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, ownerName, flatNumber, mobileNumber, password, email } = req.body;

        if (!username || !ownerName || !flatNumber || !mobileNumber || !password) {
            return res.status(400).json({ error: 'Username, owner name, flat number, mobile number, and password are required' });
        }

        // Check existing user
        const existing = await User.findOne({ 
            $or: [
                { username: username },
                { flat_number: flatNumber },
                { mobile_number: mobileNumber }
            ]
        });

        if (existing) {
            return res.status(400).json({ error: 'A user with this username, flat number or mobile number already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            owner_name: ownerName,
            flat_number: flatNumber,
            mobile_number: mobileNumber,
            email: email || null,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        res.status(201).json({ message: 'User registered successfully', ownerId: savedUser._id });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error while registering' });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Maple Apartments backend server running on port ${PORT}`);
});
