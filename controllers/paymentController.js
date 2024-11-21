
const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Razorpay = require('razorpay');




// PAYMENT

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY
});

const createRazorpayOrder = async (req, res) => {
  try {
    const amount = req.body.allSubtotal * 100
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: process.env.GMAIL_USER
    }

    razorpayInstance.orders.create(options,
      (err, order) => {
        if (!err) {
          res.status(200).send({
            success: true,
            msg: 'Order Created',
            order_id: order.id,
            amount: amount,
            key_id: process.env.RAZORPAY_ID_KEY,
            product_name: req.body.productName,
            // description:req.body.productId,

            contact: req.body.phoneRazorPay, // user details
            name: req.body.usernameRazorPay,
            email: req.body.deliveryemailRazorPay,

          });
        }
        else {
          res.status(400).send({ success: false, msg: 'Something went wrong!' });
        }
      }
    );

  } catch (error) {
    console.log(error.message);
  }
}


module.exports={
    createRazorpayOrder,

}