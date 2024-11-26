const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Order = require('../models/orderModel');

const fs = require('fs');
const path = require('path');
const sharp = require("sharp");


const bcrypt = require('bcrypt');
const { render } = require('../routes/userRoute');

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}



//to load the admin login page
const loadLogin = async (req, res) => {
    try {
        console.log('AdminLoginPage Loaded');
if(User){
    console.log('GOT USER DB ');  
}else{console.log('Error in getting USER DB');
}
        res.render('admin_login')

    } catch (error) {
        console.log("Error in loadLoginAdmin:", error.message);
    }
}


//to verify the admin login
const verifyLogin = async (req, res) => {

    try {
        const email = req.body.email
        const password = req.body.password

        const userData = await User.findOne({ email: email })

        if (userData) {
            if (userData.is_admin === 0) {
                console.log('AdminLoginPage : Users should login using the admin page');
                return res.render('admin_login', { message: "Users should login using the admin page" });
            }

            const passwordMatch = await bcrypt.compare(password, userData.password)

            if (passwordMatch) {
                req.session.user_id = userData._id
                console.log('AdminLoginPage : Admin Login Successful');
                return res.redirect('/admin/admin_home');
            }
            else {
                console.log('AdminLoginPage : Entered Email or password is incorrect');

                return res.render('admin_login', { message: "Your entered email or password is incorrect" })
            }
        }
        else {
            console.log('AdminLoginPage : Entered Email is Incorrect');

            return res.render('admin_login', { message: "Your entered email or password is incorrect" })
        }

    } catch (error) {
        console.log("Error in verifyLoginAdmin:  " + error.message);
    }
}


// USERS


// admin_users_list
const admin_users_list = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = 10; // Number of users per page

        const totalCount = await User.countDocuments({ is_admin: 0, isDeleted: false });
        const totalPages = Math.ceil(totalCount / limit);

        const usersData = await User.find({ is_admin: 0, isDeleted: false }).skip((page - 1) * limit).limit(limit);

        res.render('admin_users_list', { users: usersData, totalPages, currentPage: page })

    } catch (error) {
        console.log("Error in admin_users_list : ", error.message);

    }
}

// admin_add_users_form
const admin_add_users_form = async (req, res) => {
    try {
        res.render('admin_add_users_form')
    } catch (error) {
        console.log("Error in admin_add_users_form : ", error.message);

    }
}






// admin_add_user
const admin_add_user = async (req, res) => {
    try {
        const spassword = await securePassword(req.body.password)

        const user = new User({
            username: req.body.username,
            email: req.body.email,
            mobile: req.body.mobile,

            image: req.file ? req.file.filename : "",

            password: spassword,
            is_admin: 0,
        })

        const userData = await user.save()

        if (userData) {
            res.render('admin_add_users_form', { message: 'Your Registration has been done Successfully !' })
            console.log('User Added Successfully !');
        }
        else {
            res.render('admin_add_users_form', { message: 'Your Registration has been Failed !!!' })
            console.log('User Add has been Failed !!!');

        }
    } catch (error) {
        console.log('Error in admin_add_user err :' + error.message);
    }
}






// admin_edit_users_form
const admin_edit_users_form = async (req, res) => {

    try {

        const id = req.query.id
        const userData = await User.findById({ _id: id })

        if (userData) {
            res.render('admin_edit_users_form', { user: userData })
        }
        else {
            res.redirect('/admin/admin_users_list')
        }

    } catch (error) {
        console.log("Error in admin_edit_users_form:", error.message);
    }
}

//admin_edit_user
const admin_edit_user = async (req, res) => {
    try {
        const updateData = {
            username: req.body.username,
            email: req.body.email,
            mobile: req.body.mobile,
        };

        if (req.file) {
            updateData.image = req.file.filename;
        }

        await User.findByIdAndUpdate(req.body.user_id, { $set: updateData });
        console.log('User Edited Successfully!');

        res.redirect('/admin/admin_users_list');

    } catch (error) {

        console.log("Error in admin_edit_user: ", error.message);
        res.redirect('/admin/admin_users_list');
    }
};

//admin_delete_user
const admin_delete_user = async (req, res) => {
    try {

        const id = req.query.id;

        await User.findByIdAndUpdate(id, { $set: { isDeleted: true, status: false } })

        res.redirect('/admin/admin_users_list');

    } catch (error) {
        console.log("Error in admin_delete_user: ", error.message);
    }
}

//admin_block_user
const admin_block_user = async (req, res) => {
    try {

        const id = req.query.id;

        await User.findByIdAndUpdate(id, { $set: { status: false } })

        res.redirect('/admin/admin_users_list');

    } catch (error) {
        console.log("Error in admin_block_user: ", error.message);
    }
}
//admin_unblock_user
const admin_unblock_user = async (req, res) => {
    try {

        const id = req.query.id;

        await User.findByIdAndUpdate(id, { $set: { status: true } })

        res.redirect('/admin/admin_users_list');

    } catch (error) {
        console.log("Error in admin_unblock_user: ", error.message);
    }
}



// admin_transactions
const admin_transactions = async (req, res) => {
    try {
        const ordersData = await Order.find().sort({ orderDate: -1 });

        let totalSalesCount = 0;
        let totalOrdersAmount = 0;
        let totalDiscountAmount = 0;

        // Loop through each order to calculate totals
        ordersData.forEach(order => {
            totalSalesCount++; // Count the order
            totalOrdersAmount += order.totalPrice; // Sum up the total price
            totalDiscountAmount += (order.discountPercentage / 100) * order.totalPrice; // Calculate discount based on percentage
        });

        res.render('admin_transactions', {
            ordersData,
            totalSalesCount,
            totalOrdersAmount: totalOrdersAmount.toLocaleString('en-IN'),
            totalDiscountAmount: totalDiscountAmount.toLocaleString('en-IN')
        });
    } catch (error) {
        console.error("Error in admin_transactions: ", error.message);
    }
}









//admin_logOut
const adminLogout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');

    } catch (error) {
        console.log("Error in admin logout:", error.message)
    }
}




// ADMIN TEST
const admin_test = async (req, res) => {
    try {
        res.render('admin_test')
    } catch (error) {
        console.log("Error in admin_test : ", error.message);

    }
}

module.exports = {
    loadLogin,
    verifyLogin,
    

    admin_users_list,
    admin_add_users_form,
    admin_add_user,
    admin_edit_users_form,
    admin_edit_user,
    admin_delete_user,
    admin_block_user,
    admin_unblock_user,

    admin_transactions,


    adminLogout,
    admin_test,



}