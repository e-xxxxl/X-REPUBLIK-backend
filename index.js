const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const nodemailer = require("nodemailer")
const port = process.env.PORT || 5000
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("MongoDB connected")
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}

connectDB()

// Define Ticket Schema
const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  amount: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
  isUsed: { type: Boolean, default: false }, // Add this field
  paymentReference: { type: String },
  purchaseDate: { type: Date, default: Date.now },
})

const Ticket = mongoose.model("Ticket", ticketSchema)

// Endpoint to check if a ticket ID already exists
app.post("/check-ticket-id", async (req, res) => {
  const { ticketId } = req.body

  if (!ticketId) {
    return res.status(400).json({ error: "Ticket ID is required" })
  }

  try {
    // Check if the ticket ID exists in the database
    const existingTicket = await Ticket.findOne({ ticketId })

    // Return whether the ID is unique (doesn't exist)
    return res.status(200).json({
      isUnique: !existingTicket,
      exists: !!existingTicket,
    })
  } catch (error) {
    console.error("Error checking ticket ID:", error)
    return res.status(500).json({ error: "Failed to check ticket ID" })
  }
})

// Endpoint to store ticket data
app.post("/store-ticket", async (req, res) => {
  const { ticketId, email, category, quantity, amount, isPaid, paymentReference, purchaseDate } = req.body

  if (!ticketId || !email || !category) {
    return res.status(400).json({ message: "Required fields missing." })
  }

  try {
    // Check if the ticket ID already exists
    const existingTicket = await Ticket.findOne({ ticketId })

    if (existingTicket) {
      return res.status(409).json({ message: "Ticket ID already exists." })
    }

    const newTicket = new Ticket({
      ticketId,
      email,
      category,
      quantity: quantity || 1,
      amount: amount || 0,
      isPaid: isPaid || false,
      paymentReference,
      purchaseDate: purchaseDate || new Date(),
    })

    await newTicket.save()
    res.status(200).json({ message: "Ticket stored successfully!" })
  } catch (error) {
    console.error("Error storing ticket:", error)
    res.status(500).json({ message: "Failed to store ticket." })
  }
})
app.get("/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find({}).sort({ purchaseDate: -1 });
    res.status(200).json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ message: "Failed to fetch tickets." });
  }
});

// Add endpoint to update ticket usage status
app.patch("/tickets/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  const updateData = req.body;
  
  // Only allow specific fields to be updated for security
  const allowedUpdates = { 
    isUsed: updateData.isUsed,
    isPaid: updateData.isPaid
  };
  
  // Remove undefined fields
  Object.keys(allowedUpdates).forEach(key => 
    allowedUpdates[key] === undefined && delete allowedUpdates[key]
  );
  
  try {
    const ticket = await Ticket.findOne({ ticketId });
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    // Update the ticket
    const updatedTicket = await Ticket.findOneAndUpdate(
      { ticketId }, 
      { $set: allowedUpdates },
      { new: true } // Return the updated document
    );
    
    res.status(200).json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ message: "Failed to update ticket" });
  }
});

// Add endpoint to get single ticket
app.get("/tickets/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  
  try {
    const ticket = await Ticket.findOne({ ticketId });
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    res.status(200).json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
});

// Add endpoint for ticket validation
app.get("/validate-ticket/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  
  try {
    const ticket = await Ticket.findOne({ ticketId });
    
    if (!ticket) {
      return res.status(404).json({ 
        valid: false, 
        message: "Ticket not found" 
      });
    }
    
    // Check if ticket is paid and not used
    const isValid = ticket.isPaid && !ticket.isUsed;
    
    res.status(200).json({
      valid: isValid,
      ticket: {
        ticketId: ticket.ticketId,
        email: ticket.email,
        category: ticket.category,
        isPaid: ticket.isPaid,
        isUsed: ticket.isUsed,
        purchaseDate: ticket.purchaseDate
      },
      message: isValid 
        ? "Valid ticket" 
        : ticket.isUsed 
          ? "Ticket has already been used" 
          : "Ticket payment is pending"
    });
  } catch (error) {
    console.error("Error validating ticket:", error);
    res.status(500).json({ 
      valid: false,
      message: "Failed to validate ticket" 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

