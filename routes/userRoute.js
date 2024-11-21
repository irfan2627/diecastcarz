const express = require('express');
const user_route = express();
const session = require('express-session');

const userController = require('../controllers/userController')
const cartController = require('../controllers/cartController')
const orderController = require('../controllers/orderController')
const wishlistController = require('../controllers/wishlistController')
const paymentController = require('../controllers/paymentController')
const couponController = require('../controllers/couponController')



// view engine
user_route.set('view engine', 'ejs');
user_route.set('views', './views/user');

//session middleware
user_route.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

//middleware multer
const multerConfig = require('../multerConfig');
const { upload} = multerConfig;

//middleware auth
const userAuth = require("../middlewares/userAuth")



user_route.get('/', userAuth.isLogout, userController.loginLoad)
user_route.post('/', userAuth.isLogout, userController.verifyLogin)

// login
user_route.get('/login', userAuth.isLogout, userController.loginLoad)
user_route.post('/login', userAuth.isLogout, userController.verifyLogin)

// user_route.get('/register', userAuth.isLogout, userController.registerLoad)
// user_route.post('/register', upload.single('image'), userAuth.isLogout, userController.insertUser)

// registration
user_route.get('/register', userAuth.isLogout, userController.registerLoad);
user_route.post('/register', upload.single('image'), userAuth.isLogout, userController.insertUser);
user_route.post('/verifyotp', userAuth.isLogout, userController.verifyOtp);
user_route.post('/resendotp', userAuth.isLogout, userController.resendOtp);


// account
user_route.get('/user_account', userAuth.isLogin, userController.user_account)
user_route.post('/user_edit_details', upload.single('image'), userAuth.isLogin, userController.user_edit_details)

// password
user_route.get('/user_change_password_page', userAuth.isLogin, userController.user_change_password_page)
user_route.post('/user_change_password_page', userAuth.isLogin, userController.user_change_password)
user_route.get('/user_forgot_password', userAuth.isLogout, userController.user_forgot_password_page)
user_route.post('/user_forgot_password', userAuth.isLogout, userController.user_forgot_password)
user_route.get('/user_reset_password', userAuth.isLogout, userController.user_reset_password_page)
user_route.post('/user_reset_password', userAuth.isLogout, userController.user_reset_password)

// address
user_route.get('/user_add_address_form', userAuth.isLogin, userController.user_add_address_form)
user_route.post('/user_add_address_form', userAuth.isLogin, userController.user_add_address)
user_route.get('/user_edit_address_form', userAuth.isLogin, userController.user_edit_address_form)
user_route.post('/user_edit_address', userAuth.isLogin, userController.user_edit_address)
user_route.get('/user_delete_address', userAuth.isLogin, userController.user_delete_address)

// referrel code
user_route.post('/user_apply_referral_code', userAuth.isLogin, userController.user_apply_referral_code)


// homepage
user_route.get('/user_home', userAuth.isLogin, userController.userHome)

// product page
user_route.get('/user_shop_page', userAuth.isLogin, userController.user_shop_page)
user_route.get('/user_product_page', userAuth.isLogin, userController.user_product_page)

// wishlist
user_route.get('/user_wishlist', userAuth.isLogin, wishlistController.user_wishlist)
user_route.post('/user_wishlist', userAuth.isLogin, wishlistController.user_add_product_to_wishlist)
user_route.delete('/user_delete_wishlist_product', userAuth.isLogin, wishlistController.user_delete_wishlist_product)

// cart
user_route.get('/user_cart', userAuth.isLogin, cartController.user_cart)
user_route.post('/user_cart', userAuth.isLogin, cartController.user_add_product_to_cart)
user_route.get('/user_update_cart_quantity', userAuth.isLogin, cartController.user_update_cart_quantity)
user_route.delete('/user_delete_cart_product', userAuth.isLogin, cartController.user_delete_cart_product)
user_route.post('/user_clear_cart', userAuth.isLogin, cartController.user_clear_cart)

// checkout
user_route.get('/user_checkout', userAuth.isLogin, cartController.user_checkout)
user_route.post('/user_checkout', userAuth.isLogin, orderController.user_order_placed)

// order
user_route.get('/user_order_details', userAuth.isLogin, orderController.user_order_details)
user_route.get('/user_cancel_order', userAuth.isLogin, orderController.user_cancel_order_page)
user_route.post('/user_cancel_order', userAuth.isLogin, orderController.user_cancel_order)
user_route.get('/user_return_order', userAuth.isLogin, orderController.user_return_order_page)
user_route.post('/user_return_order', userAuth.isLogin, orderController.user_return_order)


// payment
user_route.post('/createRazorpayOrder', paymentController.createRazorpayOrder);

// coupon
user_route.get('/user_apply_coupon', userAuth.isLogin, couponController.user_apply_coupon)






// Logout
user_route.get('/logout', userAuth.isLogin, userController.userLogout);

// Test
user_route.get('/user_test', userController.user_test)



module.exports = user_route;