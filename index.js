const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const port =  process.env.PORT
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

connectDB();

// Define Ticket Schema
const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true },
    email: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

const Ticket = mongoose.model("Ticket", ticketSchema);

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use Gmail or any other SMTP service
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password or app password
    },
});

// Reusable function to send emails
const sendEmail = async (mailOptions) => {
    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
        return { success: true, message: "Email sent successfully" };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, message: "Failed to send email" };
    }
};

// Endpoint to send ticket confirmation email with QR code
app.post("/send-ticket-email", async (req, res) => {
    const { to_email, ticket_id, ticket_category, ticket_description, ticket_perks, qr_code_url } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address
        to: to_email, // Recipient address
        subject: `Your ${ticket_category} Ticket Confirmation`, // Email subject
        html: `
            <h1>Your ${ticket_category} Ticket Confirmation</h1>
            <p>Ticket ID: ${ticket_id}</p>
            <p>Category: ${ticket_category}</p>
            <p>Description: ${ticket_description}</p>
            <p>Perks: ${ticket_perks.join(', ')}</p>
            <img src="${qr_code_url}" alt="QR Code" />
            <p>Thank you for purchasing your ticket!</p>
        `,
    };

    const result = await sendEmail(mailOptions);
    res.status(result.success ? 200 : 500).json(result);
});

// Endpoint to store ticket data
app.post("/store-ticket", async (req, res) => {
    const { ticketId, email, category } = req.body;

    try {
        const newTicket = new Ticket({
            ticketId,
            email,
            category,
        });

        await newTicket.save();
        res.status(200).json({ message: "Ticket stored successfully!" });
    } catch (error) {
        console.error("Error storing ticket:", error);
        res.status(500).json({ message: "Failed to store ticket." });
    }
});

// Start the server
app.listen( port,  () => {
    console.log("Server running on port 5000");
});