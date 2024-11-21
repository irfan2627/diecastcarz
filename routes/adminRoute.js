const express = require('express');
const admin_route = express();
const session = require('express-session');
const config = require("../config/config")

// controllers
const adminController = require('../controllers/adminController')
const adminDashboardController = require('../controllers/adminDashboardController')
const productsController = require('../controllers/productsController')
const categoriesController = require('../controllers/categoriesController')
const orderController = require('../controllers/orderController')
const couponController = require('../controllers/couponController')
const offerController = require('../controllers/offerController')


// view engine
admin_route.set('view engine', 'ejs');
admin_route.set('views', './views/admin');

//session middleware
admin_route.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));


//middleware multer
const multerConfig = require('../multerConfig');
const { upload,productImages,categoryImages} = multerConfig;

//middleware auth
const adminAuth = require("../middlewares/adminAuth")


// routes
admin_route.get('/', adminAuth.isLogout, adminController.loadLogin)
admin_route.post('/', adminAuth.isLogout, adminController.verifyLogin)

admin_route.get('/admin', adminAuth.isLogout, adminController.loadLogin)
admin_route.post('/admin', adminAuth.isLogout, adminController.verifyLogin)

// DASHBOARD
admin_route.get('/admin_home', adminAuth.isLogin, adminDashboardController.adminHome)

admin_route.get('/admin_weekly_data', adminAuth.isLogin, adminDashboardController.admin_weekly_data)
admin_route.get('/admin_monthly_data', adminAuth.isLogin, adminDashboardController.admin_monthly_data)
admin_route.get('/admin_current_month_data', adminAuth.isLogin, adminDashboardController.admin_current_month_data)

admin_route.get('/admin_week_sales_data', adminAuth.isLogin, adminDashboardController.admin_week_sales_data)
admin_route.get('/admin_month_sales_data', adminAuth.isLogin, adminDashboardController.admin_month_sales_data)
admin_route.get('/admin_year_sales_data', adminAuth.isLogin, adminDashboardController.admin_year_sales_data)


// USERS
admin_route.get('/admin_users_list', adminAuth.isLogin, adminController.admin_users_list)

admin_route.get('/admin_add_users_form', adminAuth.isLogin, adminController.admin_add_users_form)
admin_route.post('/admin_add_users_form', upload.single('image'), adminAuth.isLogin, adminController.admin_add_user)

admin_route.get('/admin_edit_users_form', adminAuth.isLogin, adminController.admin_edit_users_form)
admin_route.post('/admin_edit_users_form', upload.single('image'), adminAuth.isLogin, adminController.admin_edit_user)

admin_route.get('/admin_block_user', adminAuth.isLogin, adminController.admin_block_user)
admin_route.get('/admin_unblock_user', adminAuth.isLogin, adminController.admin_unblock_user)

admin_route.get('/admin_delete_user', adminAuth.isLogin, adminController.admin_delete_user)


// PRODUCTS
admin_route.get('/admin_add_product_form', adminAuth.isLogin, productsController.admin_add_product_form)
admin_route.post('/admin_add_product_form', productImages.array('productImages',8), adminAuth.isLogin, productsController.admin_add_product)

admin_route.get('/admin_products_list', adminAuth.isLogin, productsController.admin_products_list)
admin_route.get('/admin_products_grid', adminAuth.isLogin, productsController.admin_products_grid)

admin_route.get('/admin_edit_product_form', adminAuth.isLogin, productsController.admin_edit_product_form)
admin_route.post('/admin_edit_product_form', productImages.array('productImages',8), adminAuth.isLogin, productsController.admin_edit_product)

admin_route.get('/admin_delete_product', adminAuth.isLogin, productsController.admin_delete_product)


// CATEGORIES
admin_route.get('/admin_categories_list', adminAuth.isLogin, categoriesController.admin_categories_list)

admin_route.get('/admin_add_categories_form', adminAuth.isLogin, categoriesController.admin_add_categories_form)
admin_route.post('/admin_add_categories_form', categoryImages.single('categoryImages'), adminAuth.isLogin, categoriesController.admin_add_categories)

admin_route.get('/admin_edit_categories_form', adminAuth.isLogin, categoriesController.admin_edit_categories_form)
admin_route.post('/admin_edit_categories_form', categoryImages.single('categoryImages'), adminAuth.isLogin, categoriesController.admin_edit_categories)

admin_route.get('/admin_delete_categories', adminAuth.isLogin, categoriesController.admin_delete_categories)


// ORDERS
admin_route.get('/admin_orders_list', adminAuth.isLogin, orderController.admin_orders_list)

admin_route.get('/admin_change_order_status', adminAuth.isLogin, orderController.admin_change_order_status)

admin_route.get('/admin_individual_order_page', adminAuth.isLogin, orderController.admin_individual_order_page)

admin_route.get('/admin_individual_order_cancel_page', adminAuth.isLogin, orderController.admin_individual_order_cancel_page)
admin_route.post('/admin_individual_order_cancel_page', adminAuth.isLogin, orderController.admin_individual_order_cancel)


// COUPONS
admin_route.get('/admin_coupons_list', adminAuth.isLogin, couponController.admin_coupons_list)

admin_route.get('/admin_add_coupon_form', adminAuth.isLogin, couponController.admin_add_coupon_form)
admin_route.post('/admin_add_coupon_form', adminAuth.isLogin, couponController.admin_add_coupon)

admin_route.get('/admin_edit_coupon', adminAuth.isLogin, couponController.admin_edit_coupon_form)
admin_route.post('/admin_edit_coupon', adminAuth.isLogin, couponController.admin_edit_coupon)

admin_route.get('/admin_delete_coupon', adminAuth.isLogin, couponController.admin_delete_coupon)


// PRODUCT OFFERS
admin_route.get('/admin_product_offers_list', adminAuth.isLogin, offerController.admin_product_offers_list)

admin_route.get('/admin_individual_product_offer_page', adminAuth.isLogin, offerController.admin_individual_product_offer_page)
admin_route.post('/admin_individual_product_offer_page', adminAuth.isLogin, offerController.admin_individual_product_offer)

admin_route.get('/admin_block_product_offer', adminAuth.isLogin, offerController.admin_block_product_offer)
admin_route.get('/admin_unblock_product_offer', adminAuth.isLogin, offerController.admin_unblock_product_offer)

// CATEGORY OFFERS
admin_route.get('/admin_category_offers_list', adminAuth.isLogin, offerController.admin_category_offers_list)

admin_route.get('/admin_add_category_offer_page', adminAuth.isLogin, offerController.admin_add_category_offer_page)
admin_route.post('/admin_add_category_offer_page', adminAuth.isLogin, offerController.admin_add_category_offer)

admin_route.get('/admin_block_category_offer', adminAuth.isLogin, offerController.admin_block_category_offer)
admin_route.get('/admin_unblock_category_offer', adminAuth.isLogin, offerController.admin_unblock_category_offer)


// TRANSACTIONS
admin_route.get('/admin_transactions', adminAuth.isLogin, adminController.admin_transactions)







// Logout
admin_route.get('/logout', adminAuth.isLogin, adminController.adminLogout);


admin_route.get('/admin_test', adminController.admin_test)

admin_route.get('*', function (req, res) {
  res.status(404).render('404',{message:''});
});



module.exports = admin_route;