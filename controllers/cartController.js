const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');
const Coupon = require('../models/couponsModel');



// load cart
const user_cart = async (req, res) => {
  try {

    const userData = req.session.user_id;
    let cart = await Cart.findOne({ userId: userData }).populate(
      'products.productId'
    );
    const categories = await Category.find({ isActive: true })

    res.render('user_cart', { user: userData, cart, categories })

  } catch (error) {
    console.log("Error in user_cart : ", error.message);

  }
}


// user_add_product_to_cart
const user_add_product_to_cart = async (req, res) => {
  try {

    const userData = req.session.user_id;

    if (userData) {

      const userId = userData;
      const productId = req.query.productId;
      let qty = parseInt(req.query.qty, 10) || 1;

      qty = Math.max(1, Math.floor(qty));

      const productData = await Product.findById({ _id: productId });

      let cart = await Cart.findOne({ userId: userId });

      if (!cart) {
        cart = new Cart({ userId: userId, products: [] });
      }

      const existingProduct = cart.products.find(
        (product) => product.productId.toString() === productId
      );

      if (existingProduct) {
        existingProduct.quantity += qty;
      } else {
        cart.products.push({ productId, quantity: qty });
      }

      const addedToCart = await cart.save();

      if (addedToCart) {
        console.log("Product added to cart successfully");

      }
    }

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully"
    })


  } catch (error) {
    console.log("Error in user_add_product_to_cart : ", error.message);

  }
}


// user_update_cart_quantity
const user_update_cart_quantity = async (req, res) => {
  try {
    const userId = req.session.user_id;

    const productId = req.query.productId;
    const newQuantity = parseInt(req.query.newQuantity);

    console.log("New quantity : ", newQuantity);

    let cart = await Cart.findOne({ userId: userId });

    const productIndex = cart.products.findIndex(
      (product) => product.productId.toString() === productId
    );

    if (productIndex !== -1) {
      cart.products[productIndex].quantity = newQuantity;
      await cart.save();

      const updatedCart = await Cart.findOne({ userId: userId }).populate(
        'products.productId'
      );

      return res.status(200).json({
        message: 'Cart quantity updated successfully using fetch',
        productData: updatedCart.products
      });
    } else {
      return res.status(404).json({
        message: 'Product not found in the cart',
      });
    }
  } catch (error) {
    console.error('Error in user_update_cart_quantity :', error);
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

// user_delete_cart_product
const user_delete_cart_product = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.query.productId;

    let cart = await Cart.findOne({ userId: userId });
    cart.products = cart.products.filter(product => product.productId.toString() !== productId);
    await cart.save();



    return res.status(200).json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    console.error('Error in user_remove_cart_product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

// user_clear_cart
const user_clear_cart = async (req, res) => {
  try {
    const userId = req.session.user_id;

    let cart = await Cart.findOne({ userId: userId });
    cart.products = [];
    let cleared = await cart.save();

    if (cleared) {
      console.log('Cart Cleared Successfully');

    }

    return res.status(200).json({
      success: true,
      message: 'Cart Cleared Successfully',
    });
  } catch (error) {
    console.error('Error 0 in user_clear_cart:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }

}




// user_checkout
const user_checkout = async (req, res) => {
  try {
    const userData = await User.findById({ _id: req.session.user_id })
    const categories = await Category.find({ isActive: true })
    let cart = await Cart.findOne({ userId: userData }).populate('products.productId');

    // Fetch all non-deleted coupons
    let allCouponData = await Coupon.find({ isDeleted: false });
    // Filter out expired coupons using the isExpired virtual field
    let couponData = allCouponData.filter(coupon => !coupon.isExpired);


    res.render('user_checkout', {
      message: "",
      user: userData,
      cart,
      categories,
      productData: cart.products,
      coupons: couponData
    })
  } catch (error) {
    console.log("Error in user_checkout : ", error.message);
  }
}







module.exports = {
  user_cart,
  user_add_product_to_cart,
  user_update_cart_quantity,
  user_delete_cart_product,
  user_clear_cart,
  user_checkout,


}