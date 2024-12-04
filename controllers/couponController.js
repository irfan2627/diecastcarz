const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');
const Coupon = require('../models/couponsModel');



const admin_coupons_list = async (req, res) => {
    try {
        const couponData = await Coupon.find({ isDeleted: false });
        res.render('admin_coupons_list', { couponData, message: "" });
    } catch (error) {
        console.log("Error in admin_coupons_list : ", error.message);
    }
};

const admin_add_coupon_form = async (req, res) => {
    try {
        res.render('admin_add_coupon_form', { message: "" });
    } catch (error) {
        console.log("Error in admin_add_coupon_form : ", error.message);
    }
};


const admin_add_coupon = async (req, res) => {
    try {

        const newCoupon = new Coupon({
            couponCode: req.body.couponCode,
            discountPercentage: req.body.discountPercentage,
            minimumAmount: req.body.minimumAmount,
            maximumAmount: req.body.maximumAmount,
            couponExpiry: req.body.couponExpiry,
            maxUsesPerUser: req.body.maxUsesPerUser,

        });

        let existingCouponCode = await Coupon.findOne({ couponCode: newCoupon.couponCode });

        if (existingCouponCode) {
            res.render('admin_add_coupon_form', { message: "Coupon already exists with that coupon code, Duplicate coupon is not created" });
        } else {
            let added = await newCoupon.save();
            if (added) {
                console.log("COUPON ADDED SUCCESSFULLY !");
                const couponData = await Coupon.find({ isDeleted: false });
                res.render('admin_coupons_list', { couponData, message: 'Coupon Added Successfully!' });
            }
            else {
                console.log("ADDING COUPON FAILED !");
                res.render('admin_coupons_list', { couponData, message: 'Problem with Adding Coupon, Please Try Again Later!' });
            }
        }
    } catch (error) {
        console.log("Error in admin_add_coupon", error.message);
        res.status(500).send("Internal Server Error");
    }
};



// admin_edit_coupon_form
const admin_edit_coupon_form = async (req, res) => {
    try {
        const id = req.query.couponId

        const couponData = await Coupon.findById({ _id: id })

        if (couponData) {
            res.render('admin_edit_coupon_form', { couponData })
        }
        else {
            res.redirect('/admin/admin_coupons_list')
        }

    } catch (error) {
        console.log("Error in admin_edit_coupon_form:", error.message);
    }
}

//admin_edit_coupon
const admin_edit_coupon = async (req, res) => {
    try {
        const couponId = req.query.couponId

        const updateData = {
            couponCode: req.body.couponCode,
            discountPercentage: req.body.discountPercentage,
            minimumAmount: req.body.minimumAmount,
            maximumAmount: req.body.maximumAmount,
            couponExpiry: req.body.couponExpiry,
            maxUsesPerUser: req.body.maxUsesPerUser,
        };

        let existingCouponCode = await Coupon.findOne({ couponCode: updateData.couponCode });

        if (existingCouponCode && existingCouponCode._id.toString() !== couponId) {
            return res.render('admin_add_coupon_form', { message: "Coupon already exists with that coupon code, Duplicate coupon is not created" });
        } else {
            let updated = await Coupon.findByIdAndUpdate(couponId, { $set: updateData });
            if (updated) {
                console.log('Coupon Edited Successfully!');
                const couponData = await Coupon.find({ isDeleted: false });
                res.render('admin_coupons_list', { couponData, message: "Coupon Edited Successfully ! " });
            }
            else {
                console.log("EDITING COUPON FAILED !");
                const couponData = await Coupon.find({ isDeleted: false });
                res.render('admin_coupons_list', { couponData, message: 'Problem with Editing Coupon, Please Try Again Later!' });
            }

        }


    } catch (error) {

        console.log("Error in admin_edit_coupon : ", error.message);
        res.redirect('/admin/admin_coupons_list');
    }
};

//admin_delete_coupon
const admin_delete_coupon = async (req, res) => {
    try {

        const id = req.query.couponId

        const deleted = await Coupon.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } })
        if (deleted) {
            console.log('Coupon Deleted Successfully!');
            const couponData = await Coupon.find({ isDeleted: false });
            res.render('admin_coupons_list', { couponData, message: "Coupon Deleted Successfully ! " });
        } else {
            console.log("DELETING COUPON FAILED !");
            const couponData = await Coupon.find({ isDeleted: false });
            res.render('admin_coupons_list', { couponData, message: 'Problem with Deleting Coupon, Please Try Again Later!' });
        }



    } catch (error) {
        console.log("Error in admin_delete_coupon: ", error.message);
    }
}



//////////////////      USER



// user_apply_coupon
const user_apply_coupon = async (req, res) => {
    try {
        console.log('USER APPLY COUPON');

        const userData = await User.findById({ _id: req.session.user_id })
        if (!userData) {
            console.log('USER APPLY COUPON FUNCION');
            throw new Error("User not logged in.");
        }

        // Retrieve or create cart
        let cart = await Cart.findOne({ userId: userData }).populate('products.productId');
        if (!cart) {
            cart = new Cart({ userData, products: [] });
            await cart.save();
            cart = await Cart.findOne({ userData }).populate('products.productId');
        }

        const enteredCoupon = req.query.enteredCoupon;
        const priceChecking = req.query.priceChecking;
        const couponsData = await Coupon.find({ isDeleted: false }).filter(coupon => !coupon.isExpired);;
        const categories = await Category.find({ isActive: true })


        // Extract coupon
        const couponData = await Coupon.findOne({ couponCode: enteredCoupon });

        // Check if the coupon exists
        if (!couponData) {
            console.log('USER APPLY COUPON FUNCION 0');

            return res.render('user_checkout', {
                productData: cart.products,
                user: userData,
                coupons: couponsData,
                cart,
                categories,
                couponCode,
                message: "Coupon is not valid"
            });
        }

        // Extract coupon details
        const { couponCode, discountPercentage, minimumAmount, isActive, maxUsesPerUser, maximumAmount } = couponData;


        // Check if the coupon is expired using the virtual field
        if (couponData.isExpired) {
            console.log('USER APPLY COUPON FUNCION 1');
            return res.render('user_checkout', {
                productData: cart.products,
                user: userData,
                coupons: couponsData,
                cart,
                categories,
                couponCode,
                message: "Coupon is Expired"
            });
        }

        // Check redemption limit per user
        const redemptionCount = await Coupon.countDocuments({ "redemptionHistory.userId": userData, couponCode });
        if (redemptionCount >= maxUsesPerUser) {
            console.log('USER APPLY COUPON FUNCION 2');

            return res.render('user_checkout', {
                productData: cart.products,
                user: userData,
                coupons: couponsData,
                cart,
                categories,
                couponCode,
                message: "Coupon usage limit exceeded (Already applied earlier)"
            });
        } else {
            console.log(`\n Not used Max \n maxUsesPerUser is : ${maxUsesPerUser} \n redemptionCount is : ${redemptionCount} `);
        }

        // Check minimum amount condition
        if (priceChecking < minimumAmount) {
            const additionalAmountNeeded = minimumAmount - priceChecking;
            console.log('USER APPLY COUPON FUNCION 3');

            return res.render('user_checkout', {
                productData: cart.products,
                user: userData,
                coupons: couponsData,
                cart,
                categories,
                couponCode,
                message: `Add more products worth Rs.${additionalAmountNeeded} more to apply coupon`
            });
        }

        // Apply the coupon if it's active
        if (isActive) {
            console.log('USER APPLY COUPON FUNCION 4');

            return res.render('user_checkout', {
                productData: cart.products,
                user: userData,
                coupons: couponsData,
                cart,
                categories,
                couponsData,
                couponCode,
                discountPercentage,
                minimumAmount,
                maximumAmount,
                message: "Coupon applied successfully"
            });
        } else {
            console.log('USER APPLY COUPON FUNCION 5');

            return res.render('user_checkout', {
                productData: cart.products,
                user: userData,
                coupons: couponsData,
                cart,
                categories,
                couponCode,
                message: "Coupon expired or invalid"
            });
        }

    } catch (error) {
        console.log("Error in user_apply_coupon : ", error.message);

    }
}



module.exports = {
    admin_coupons_list,
    admin_add_coupon_form,
    admin_add_coupon,
    admin_edit_coupon_form,
    admin_edit_coupon,
    admin_delete_coupon,

    user_apply_coupon
}