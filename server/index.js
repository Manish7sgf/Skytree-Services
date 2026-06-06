import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('✅ Razorpay Payment Backend is successfully running!');
});

// NOTE: Replace these with your actual Razorpay keys
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TYxxQkZzzXzzZZ';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_test_secret_key';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const options = {
      // Amount in paise
      amount: parseInt(amount, 10) * 100,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    let order_id, order_amount, order_currency;
    if (RAZORPAY_KEY_ID === 'rzp_test_TYxxQkZzzXzzZZ') {
      // DEMO MODE: Auto-generate a local order ID to prevent Razorpay 401 Unauthorized API error
      order_id = `order_sim_${Date.now()}`;
      order_amount = options.amount;
      order_currency = 'INR';
    } else {
      // LIVE MODE: Call real Razorpay API
      const order = await razorpay.orders.create(options);
      order_id = order.id;
      order_amount = order.amount;
      order_currency = order.currency;
    }
    
    res.json({
      success: true,
      order_id,
      amount: order_amount,
      currency: order_currency
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error while creating order' });
  }
});

app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (razorpay_order_id && razorpay_order_id.startsWith('order_sim_')) {
      // DEMO MODE: bypass actual signature crypto
      return res.json({ success: true, message: 'Simulated payment verified locally' });
    }

    // Create HMAC signature logic
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Signature is legit
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature. Payment tampering detected.' });
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Skytree Payment Server running on http://localhost:${PORT}`);
});
