const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');
const Wishlist = require('../models/wishlistModel');



// load wishlist
const user_wishlist = async (req, res) => {
  try {

    const userData = req.session.user_id;

    const categories = await Category.find({ isActive: true });
    let cart = await Cart.findOne({ userId: userData }).populate(
      'products.productId'
    );
    if (!cart) {
      cart = new Cart({ userId: userData, products: [] });
    }



    // Check if the user has a wihslist
    let wishlist = await Wishlist.findOne({ userId: userData });

    if (!wishlist) {
      wishlist = new Wishlist({ userId: userData, products: [] });
      await wishlist.save();
    }

    // Fetch the updated cart to get the latest quantities
    const updatedWishlist = await Wishlist.findOne({ userId: userData }).populate(
      'products.productId'
    );

    res.render('user_wishlist', { categories,cart, user: userData, productData: updatedWishlist.products })

  } catch (error) {
    console.log("Error in user_wishlist : ", error.message);

  }
}


// user_add_product_to_wishlist
const user_add_product_to_wishlist = async (req, res) => {
  try {
    const userData = req.session.user_id;

    if (userData) {

      const userId = userData;
      const productId = req.query.productId;

      console.log("addNewProductsToWishlist- productId :  ", productId)

      const productData = await Product.findById({ _id: productId });
      // console.log("productData: ",productData)

      let wishlist = await Wishlist.findOne({ userId: userId });

      if (!wishlist) {
        wishlist = new Wishlist({ userId: userId, products: [] });
      }

      const existingProduct = wishlist.products.find(
        (product) => product.productId.toString() === productId
      );

      if (existingProduct) {

      } else {
        wishlist.products.push({ productId });
      }


      await wishlist.save();

      return res.status(200).json({
        success: true,
        message: "Product added to wishlist successfully"
      })
    }
  } catch (error) {
    console.error('Error in user_add_product_to_wishlist', error.message);
    res.status(500).send('Internal Server Error');
  }
}


// user_delete_wishlist_product
const user_delete_wishlist_product = async (req, res) => {
  try {
    const userData = req.session.user_id;
    const productId = req.query.productId;

    let wishlist = await Wishlist.findOne({ userId: userData });
    wishlist.products = wishlist.products.filter(product => product.productId.toString() !== productId);
    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    console.error('Error in user_delete_wishlist_product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};




module.exports = {
  user_wishlist,
  user_add_product_to_wishlist,
  user_delete_wishlist_product

}