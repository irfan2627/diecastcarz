const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Coupon = require('../models/couponsModel');


const nodemailer = require("nodemailer");
const randomstring = require("randomstring")
const bcrypt = require('bcryptjs');

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}





// register load
const registerLoad = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });

        res.render('register', { categories, message:'' })
    } catch (error) {
        console.log("registerLoad err :" + error.message);

    }
}


////////////////////////////////////////////////////////////////////

// insert user (without OTP)


// const insertUser = async (req, res) => {
//     try {
//         const spassword = await securePassword(req.body.password)

//         const user = new User({
//             username: req.body.username,
//             email: req.body.email,
//             mobile: req.body.mobile,
//             image: req.file ? req.file.filename : "",
//             password: spassword,
//             is_admin: 0,
//         })

//         const userData = await user.save()

//         if (userData) {
//             res.render('register', { message: 'Your Registration has been done Successfully !' })
//             console.log('Your Registration has been done Successfully !');
//         }
//         else {
//             res.render('register', { message: 'Your Registration has been Failed !!!' })
//             console.log('Your Registration has been Failed !!!');
//         }
//     } catch (error) {
//         console.log('insertUser err :' + error.message);
//     }
// }

//////////////////////////////////////////////////////////////////////



// insert user (with OTP)


const insertUser = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });

        const username = req.body.username
        const email = req.body.email
        const mobile = req.body.mobile
        const password = req.body.password
        const referralCode = await generateReferralCode(6);


        const spassword = await securePassword(req.body.password)

        if (req.session.referralEnteredAtSignUp) {
            wallet = 100;
            isReferralRewardClaimed = true
        } else {
            wallet = 0
            isReferralRewardClaimed = false
        }

        const user = new User({
            username,
            email,
            mobile,
            password: spassword,
            referralCode,
            wallet

        })

        if (req.file) {
            user.image = req.file.filename;
        }

        const mailExisting = await User.findOne({ email: user.email });
        const usernames = await User.findOne({ username: user.username });

        if (usernames && user.username === usernames.username) {
            const userData = req.session.userData
            return res.render('register', { message: "Username already exists in the system, Try logging in or create new account with a different username.", userData, categories });
        }
        else if (mailExisting && user.email === mailExisting.email) {
            const userData = req.session.userData
            return res.render('register', { message: "An account already exists with this email id, Try logging in", userData, categories });
        } else {

            const generatedOtp = generateOtp();
            req.session.user = {
                ...user.toObject(),
                otp: generatedOtp,
                otpTimestamp: Date.now(),
                resendAttempts: 0,
            };

            console.log("Otp for user verification:", generatedOtp);

            mailTransporter(email, generatedOtp);
            res.render('verifyotp', {
                categories,
                message: {
                    type: 'success',
                    title: ' OTP Sent',
                    text: `Hello ${username}, Please enter the OTP sent to  ${email} within 60 seconds`
                },
                time: new Date(new Date().getTime() + 60000).toLocaleString()
            });

        }



    } catch (error) {
        const categories = await Category.find({ isActive: true });

        res.render('register', { categories, message: 'Your Registration has been Failed !!!' })
        console.log('Your Registration has been Failed !!!');

        console.log('insertUser err :' + error.message);
    }
}

const maxResendAttempts = 3;
const generateReferralCode = async (length) => {
    try {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            result += charset.charAt(randomIndex);
        }

        return result;
    } catch (error) {
        console.error('Error in userController-generateReferralCode:', error);
        res.status(500).send('Internal Server Error');
    }
}


// verify Otp
const verifyOtp = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });

        const enteredOtp = req.body.verifyotp;
        const user = req.session.user;

        const isOtpValid = enteredOtp === user.otp.toString();
        const isExpired = isOtpExpired(user.otpTimestamp);

        if (isOtpValid && !isExpired) {

            await User.create(user);
            console.log("User successfully created:", user);

            res.render('verifyotp', { categories, message: { type: 'success', title: 'User registered', text: 'Your registration is successful, Please login now' }, time: new Date(Date.now()).toLocaleString() });
        } else {

            if (isExpired) {
                return res.render('verifyotp', { categories, message: { type: 'error', title: 'OTP Expired', text: 'Please regenerate OTP and try again.' }, time: new Date(Date.now()).toLocaleString() });
            }
            res.render('verifyotp', { categories, message: { type: 'error', title: 'Invalid OTP', text: 'The otp you entered is incorrect, Please try again.' }, time: new Date(Date.now()).toLocaleString() });
        }
    } catch (error) {
        const categories = await Category.find({ isActive: true });

        console.log("Error in verifyOtp: " + error.message);
        res.render('verifyotp', { categories, message: { type: 'error', title: 'An error occurred', text: ' Please try again later' }, time: new Date(Date.now()).toLocaleString() });
    }
};

// mail 
const mailTransporter = (email, otp) => {
    let mailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    let details = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: " OTP for registration",
        text: `Hello, Your OTP for registration is:"${otp}",
          This otp is only valid for 60 seconds Please verify before the time expires`
    };

    mailTransporter.sendMail(details, (err) => {
        if (err) {
            console.log("Error in sending mail", err);
        } else {
            console.log(`OTP sent to  ${email} for verification`);
        }
    });
};


// resend otp
const resendOtp = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });

        if (req.session.user.resendAttempts < maxResendAttempts) {
            const email = req.session.user.email;
            const generatedOtp = generateOtp();
            req.session.user.otp = generatedOtp;
            req.session.user.otpTimestamp = Date.now();
            req.session.user.resendAttempts++;

            console.log("New otp :", generatedOtp);

            mailTransporter(email, generatedOtp);
            res.render('verifyotp', { categories, message: { type: 'info', title: 'OTP sent', text: 'Please enter the new OTP sent to your mail id.' }, time: new Date(new Date().getTime() + 60000).toLocaleString() });

        } else {
            res.render('verifyotp', { categories, message: { type: 'error', title: 'Resent attempts exceeded', text: 'Please try again later.' }, time: new Date(Date.now()).toLocaleString() });

        }
    } catch (error) {
        const categories = await Category.find({ isActive: true });

        console.log("Error in resendOtp: " + error.message);
        res.render('verifyotp', { categories, message: { type: 'error', title: 'Error', text: 'Please try again later' }, time: new Date(Date.now()).toLocaleString() });
    }
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

const isOtpExpired = (timestamp) => {
    const now = Date.now();
    const otpExpirationTime = timestamp + 65 * 1000; // OTP is valid for 60 seconds
    return now > otpExpirationTime;
};







// login load
const loginLoad = async (req, res) => {
    try {
        const categoriesData = await Category.find({ isActive: true });
        console.log('login1');

        res.render('login', {
            categories: categoriesData,
        })
    } catch (error) {
        console.log("loginLoad err :" + error.message);
    }
}







//verifyLogin
const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password

        console.log("mail is " + email);
        console.log("pass is " + password);

        const userData = await User.findOne({ email: email })
        const categories = await Category.find({ isActive: true });


        if (userData) {

            if (userData.is_admin === 1) {
                console.log('login2');

                return res.render('login', { categories, message: { type: 'error', title: " Admins should login using the admin page !" } });
            }
            if (userData.isDeleted === true) {
                console.log('login3');

                return res.render('login', { categories, message: { type: 'error', title: "Your account is deleted by the Admin, Cannot Login !" } })
            }
            if (userData.status === false) {
                console.log('login4');

                return res.render('login', { categories, message: { type: 'error', title: "You are blocked by the admin, Cannot login !" } })
            }

            const passwordMatch = await bcrypt.compare(password, userData.password)

            if (passwordMatch) {

                req.session.user_id = userData._id
                res.redirect('/user_home');

            }
            else {
                console.log('login5');

                res.render('login', { categories, message: { type: 'error', title: "Entered Email or password is incorrect" } })
            }
        }
        else {
            console.log('login6');

            res.render('login', { categories, message: { type: 'error', title: "Entered Email or password is incorrect" } })
        }

    } catch (error) {
        console.log("Error in verifyLoginUsers : " + error.message);
    }
}


//////////////////////////////////////////////////////////////////
///////////////////                         AFTER LOGGED IN
/////////////////////////////////////////////////////////////////


//user home
const userHome = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id })
        const productsData = await Product.find({ isActive: true })
        const categoriesData = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        const topSellingProducts = await Order.aggregate([
            { $unwind: "$products" }, // Decompose the products array
            {
                $group: {
                    _id: "$products.productId", // Group by productId
                    totalQuantity: { $sum: "$products.quantity" }, // Sum the quantity
                    productName: { $first: "$products.productName" } // Get the product name
                }
            },
            {
                $lookup: {
                    from: "products", // Name of the Product collection
                    localField: "_id", // _id from the current collection
                    foreignField: "_id", // _id from the Product collection
                    as: "productDetails" // Output field name for the joined data
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort by totalQuantity descending
            { $limit: 8 } // Get the top product
        ]);

        const topSellingCategories = await Order.aggregate([
            { $unwind: "$products" }, // Deconstruct the products array
            {
                $lookup: {
                    from: "products", // Reference the Product collection
                    localField: "products.productId", // Match productId from Orders' products array
                    foreignField: "_id", // Match with _id in Product collection
                    as: "productDetails" // Alias for the result set
                }
            },
            { $unwind: "$productDetails" }, // Unwind the productDetails to work with individual product documents
            {
                $lookup: {
                    from: "categories", // Reference the Category collection
                    localField: "productDetails.category", // Match category (string) from Product collection
                    foreignField: "categoryName", // Match with categoryName in Category collection
                    as: "categoryDetails" // Alias for the result set
                }
            },
            { $unwind: "$categoryDetails" }, // Unwind the categoryDetails array to work with the category
            {
                $group: {
                    _id: "$categoryDetails.categoryName", // Group by category name
                    totalQuantity: { $sum: "$products.quantity" }, // Sum the quantities sold for each category
                    categoryImage: { $first: "$categoryDetails.categoryImages" }, // Include categoryImage from Category
                    isCategoryOfferActive: { $first: "$categoryDetails.isCategoryOfferActive" },
                    categoryOfferPercentage: { $first: "$categoryDetails.categoryOfferPercentage" }
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort categories by total quantity sold in descending order
            { $limit: 10 } // Limit to top 10 categories
        ]);

        const dealProducts = await Product.find({ isActive: true, isProductOfferActive: true })



        if (topSellingCategories && topSellingProducts && dealProducts) {
            console.log('gotTopAndDealProducts');

        }


        if (userData.is_admin === 0) {
            res.render('user_home', {
                user: userData,
                products: productsData,
                categories: categoriesData,
                cart,
                topSellingProducts,
                topSellingCategories,
                dealProducts

            })
        }

    } catch (error) {
        console.log('userHome err :' + error.message);
    }
}




//user_shop_page
const user_shop_page = async (req, res) => {
    try {
        const userData = req.session.user_id
        const categoriesData = await Category.find({ isActive: true }).sort({ categoryName: 1 });
        // const productsData = await Product.find({ isActive: true })
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        // queries
        let categoryName = req.query.categoryName || 'All Brands'
        let sort = req.query.sort || 'Featured'
        let stock = req.query.stock || 'All'
        let searchQuery = req.query.searchQuery || '';

        console.log(` Category: ${categoryName} \n Search: ${searchQuery} \n sort: ${sort} \n stock: ${stock} `);

        let productsData;
        const searchFilter = searchQuery ? { $text: { $search: searchQuery } } : {};

        if (categoryName === 'All Brands') {
            productsData = await Product.find({ isActive: true, ...searchFilter }).sort(getSortCriteria(sort));
        } else {
            productsData = await Product.find({ isActive: true, category: categoryName, ...searchFilter }).sort(getSortCriteria(sort));
        }

        // Filter products to only include those in stock if "In Stock<" is selected
        if (stock === 'In Stock') {
            productsData = productsData.filter(product => product.quantity > 0);
        }

        res.render('user_shop_page', {
            products: productsData,
            categories: categoriesData,
            user: userData,
            selectedSort: sort,
            stock: stock,
            selectedCategory: categoryName,
            cart

        })

    } catch (error) {
        console.log('Error in user_shop_page :' + error.message);
    }
}

// Helper function to determine sorting criteria
const getSortCriteria = (sort) => {
    switch (sort) {
        case 'Newest':
            return { _id: -1 };
        case 'Price: Low to High':
            return { salesPrice: 1 };
        case 'Price: High to Low':
            return { salesPrice: -1 };
        case 'A to Z':
            return { productName: 1 };
        case 'Z to A':
            return { productName: -1 };
        default:
            return {};
    }
};




//user_product_page
const user_product_page = async (req, res) => {
    try {
        const userData = req.session.user_id
        const id = req.query.id
        const productData = await Product.findById({ _id: id })
        const categories = await Category.find({ isActive: true });

        const categoryProducts = await Product.find({ isActive: true, category: productData.category }).sort({ _id: -1 })
        const otherProducts = await Product.find({ isActive: true }).sort({ _id: -1 })
        let relatedProducts = [...categoryProducts]; // Start with categoryProducts

        // Check if there are still spaces left in the relatedProducts array
        if (relatedProducts.length < 8) {
            // Add other products to fill the remaining space, ensuring no more than 8 items
            const remainingSpace = 8 - relatedProducts.length;
            relatedProducts = [...relatedProducts, ...otherProducts.slice(0, remainingSpace)];
        }

       
        if (relatedProducts) {
            console.log("\n relatedProducts sum is:", relatedProducts.length);
            relatedProducts.forEach(product => {
                console.log("\n relatedProducts productName is:", product.productName);
            });
        }


        if (productData) {
            let cart = await Cart.findOne({ userId: userData }).populate(
                'products.productId'
            );
            if (!cart) {
                cart = new Cart({ userId: userData, products: [] });
            }

            res.render('user_product_page', { products: productData,relatedProducts, user: userData, cart, categories })
        }
        else {
            res.redirect('/user_home')
        }

    } catch (error) {
        console.log('Error in user_product_page :' + error.message);
    }
}




//////////////////////////////////////////////////
///////////////////                      USER ACCOUNT
/////////////////////////////////////////////////


// user_account
const user_account = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id })
        const categoriesData = await Category.find({ isActive: true })
        const productsData = await Product.find({ isActive: true })
        const ordersData = await Order.find({ userId: userData });

        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', { user: userData, cart, productsData: productsData, categories: categoriesData, ordersData: ordersData, message: "" })
    } catch (error) {
        console.log("Error in user_account : ", error.message);
    }
}

//user_edit_details
const user_edit_details = async (req, res) => {
    try {
        const userId = req.session.user_id

        const updateData = {
            username: req.body.username,
            email: req.body.email,
            mobile: req.body.mobile,
        };

        if (req.file) {
            updateData.image = req.file.filename;
        }

        let updated = await User.findByIdAndUpdate(userId, { $set: updateData });

        if (updated) {
            console.log('User Edited Details Successfully!');
        }
        else {
            console.log('Error in Updating Details');

        }

        const userData = await User.findById({ _id: req.session.user_id })
        const categoriesData = await Category.find({ isActive: true })
        const productsData = await Product.find({ isActive: true })
        const ordersData = await Order.find({ userId: userData });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', { user: userData, message: "Details Updated Successfully", cart, productsData: productsData, categories: categoriesData, ordersData: ordersData });

    } catch (error) {
        console.log("Error in user_edit_details : ", error.message);
        res.redirect('/user_account');
    }
};


// user_change_password_page
const user_change_password_page = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })

        res.render('user_change_password_page', { categories, message: "  " });
    } catch (error) {
        console.log("Error in user_change_password_page", error.message);
    }
};

//user_change_password
const user_change_password = async (req, res) => {
    try {
        const oldpassword = req.body.oldpassword;
        const newpassword = req.body.newpassword;
        const confirmpassword = req.body.confirmpassword;
        const userData = await User.findById({ _id: req.session.user_id })
        const categories = await Category.find({ isActive: true })

        if (!userData) {
            return res.render('user_change_password_page', { categories, message: "User not found." });
        }

        const oldPasswordMatch = await bcrypt.compare(oldpassword, userData.password);

        if (!oldPasswordMatch) {
            return res.render('user_change_password_page', { categories, message: "Old password is incorrect, try again" });
        }

        if (newpassword !== confirmpassword) {
            return res.render('user_change_password_page', { categories, message: "New password and confirm password do not match." });
        }

        const newPasswordHash = await securePassword(newpassword);
        const updatedpass = await User.findByIdAndUpdate({ _id: userData._id }, { $set: { password: newPasswordHash } });

        if (updatedpass) {
            console.log("User Password Changed Successfully");
            return res.render('user_change_password_page', { categories, message: "Password changed successfully." });

        }

    } catch (error) {
        console.log("Error in user_change_password", error.message);
        res.render('user_change_password_page', { categories, message: "An error occurred. Please try again." });
    }
};

// user_forgot_password_page
const user_forgot_password_page = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })

        res.render('user_forgot_password', { categories })
    } catch (error) {
        console.log("Error in user_forgot_password_page : ", error.message)
    }
}

// user_forgot_password
const user_forgot_password = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email });

        if (userData) {
            const randomString = randomstring.generate();

            const updatedData = await User.updateOne({ email: email }, { $set: { token: randomString } });

            resetMailTransporter(userData.username, userData.email, randomString);

            const categories = await Category.find({ isActive: true })

            res.render('user_forgot_password', { categories, message: { type: 'success', title: 'Reset link sent', text: 'Password reset link is sent to the registered mail id' } });

        } else {

            res.render('user_forgot_password', { message: { type: 'error', title: 'User not found', text: 'Entered Email id is not registered . Please try again' } });
        }

    } catch (error) {
        console.log(" Error in user_forgot_password : ", error.message)
    }
}


// Reset Mail
const resetMailTransporter = (name, email, token) => {
    let resetMailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    let details = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Reset Password",
        html: `<p>Hello ${name}, Click here to 
              <a href="http://127.0.0.1:8000/user_reset_password?token=${token}"> reset </a> your password.
              </p>`
    };

    resetMailTransporter.sendMail(details, (err) => {
        if (err) {
            console.log("Error in sending mail", err);
        } else {
            console.log(`Reset password link sent to  ${email}`);
        }
    });
};


// user_reset_password_page
const user_reset_password_page = async (req, res) => {
    try {
        const userData = req.session.userData
        const token = req.query.token
        const tokenData = await User.findOne({ token: token })

        const categories = await Category.find({ isActive: true })


        if (token) {
            console.log("token recieved");

            res.render('user_reset_password', { categories, user_id: tokenData._id, userData });

        } else {
            res.render('404', { categories, message: "Token is invalid" })
        }

    } catch (error) {
        res.render('404', { categories, message: "Token is invalid" })

        console.log("Error in user_reset_password_page : ", error.message)
    }
}

// user_reset_password
const user_reset_password = async (req, res) => {
    try {

        const password = await securePassword(req.body.password)
        const user_id = req.body.user_id;
        const userData = req.session.userData

        const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password: password, token: '' } });
        const categories = await Category.find({ isActive: true })

        if (updatedData) {
            console.log("Password updated: ", updatedData.username, updatedData.password)

            res.render('user_reset_password', { categories, user_id, userData, message: { type: 'success', title: 'Password Updated', text: 'Your password have been updated, You can login now with the new password' } })
            //  res.render('/login', {userData, message:{ type: 'success', title: 'Password Updated', text: 'Your password have been updated, You can login now with the new password'}  });

        }
        else {
            return res.render('404', { message: "Error updating password" });
        }


    } catch (error) {
        console.log("error in user_reset_password : ", error.message)
    }
}








// user_add_address_form
const user_add_address_form = async (req, res) => {
    try {
        const userData = req.session.user_id

        const categories = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_add_address_form', { user: userData, cart, categories })
    } catch (error) {
        console.error('Error in user_add_address_form :', error);
    }
}

// user_add_address
const user_add_address = async (req, res) => {
    try {

        const newAddress = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            deliveryemail: req.body.deliveryemail,
            phone: req.body.phone,
            street: req.body.street,
            addressLine2: req.body.addressLine2,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            zipCode: req.body.zipCode,
        };


        await User.findByIdAndUpdate(req.session.user_id, {
            $push: { address: newAddress },
        }, { new: true });
        console.log('User Address Added Successfully!');

        const userData = await User.findById({ _id: req.session.user_id })
        const categories = await Category.find({ isActive: true })
        const productsData = await Product.find({ isActive: true })
        const ordersData = await Order.find({ userId: userData });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', { user: userData, cart, productsData: productsData, categories, ordersData: ordersData, message: "Address added successfully" });
    } catch (error) {
        console.error('Error in user_add_address : ', error);
    }
};

// user_edit_address_form
const user_edit_address_form = async (req, res) => {
    try {

        const userData = req.session.user_id
        const addressid = req.query.addressid;
        const addressData = await User.findById(
            userData,
            { 'address.$': 1 },
            { new: true }
        ).elemMatch('address', { _id: addressid });

        const ordersData = await Order.find({ userId: userData });
        const categories = await Category.find({ isActive: true })
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_edit_address_form', { user: userData, cart, categories, addressData: addressData })
    } catch (error) {
        console.error('Error in user_edit_address_form :', error);
    }
}

0
// user_edit_address
const user_edit_address = async (req, res) => {
    try {

        const updatedAddress = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            deliveryemail: req.body.deliveryemail,
            phone: req.body.phone,
            street: req.body.street,
            addressLine2: req.body.addressLine2,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            zipCode: req.body.zipCode,
        };

        const userData = await User.findById({ _id: req.session.user_id })

        const updatedUserData = await User.findOneAndUpdate(
            {
                _id: userData._id,
                'address._id': req.body.addressId,
            },
            {
                $set: { 'address.$': updatedAddress }
            },
            { new: true }
        );

        console.log('User Address Edited Successfully!');


        const categories = await Category.find({ isActive: true })
        const productsData = await Product.find({ isActive: true })
        const ordersData = await Order.find({ userId: userData });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', { user: updatedUserData, cart, productsData: productsData, categories, ordersData: ordersData, message: "Address Edited successfully" });
    } catch (error) {
        console.error('Error in user_edit_address : ', error);
    }
};

// user_delete_address
const user_delete_address = async (req, res) => {
    try {
        const addressId = req.query.addressid;
        const userData = req.session.user_id;

        const updatedUserData = await User.findByIdAndUpdate(
            userData,
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        console.log('User Address Deleted Successfully!');

        const categoriesData = await Category.find({ isActive: true })
        const productsData = await Product.find({ isActive: true })
        const ordersData = await Order.find({ userId: userData });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', { user: updatedUserData, cart, message: "Address deleted successfully", productsData: productsData, categories: categoriesData, ordersData: ordersData });
    } catch (error) {
        console.error('Error in user_delete_address:', error);
        res.status(500).send('Internal Server Error');
    }
};



// user_apply_referral_code
const user_apply_referral_code = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id })

        const referralEntered = req.body.referralEntered;
        const walletIncrement = 100;
        const numberOfReferrals = 1;

        const categories = await Category.find({ isActive: true })
        const productsData = await Product.find({ isActive: true })
        const ordersData = await Order.find({ userId: userData });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }


        let messageSuccess;

        if (referralEntered === userData.referralCode) {
            return res.render('user_account', {
                user: userData, cart, productsData: productsData, categories, ordersData: ordersData,
                message: "Cannot use your own referral id, try again",
            });
        }

        if (referralEntered) {
            const existingUserOfReferral = await User.findOneAndUpdate(
                { referralCode: referralEntered },
                { $inc: { wallet: walletIncrement, numberOfReferralsDone: numberOfReferrals } },
                { new: true }
            );

            if (existingUserOfReferral) {
                const currentUser = await User.findOneAndUpdate(
                    { username: userData.username },
                    { $inc: { wallet: walletIncrement }, $set: { isReferralRewardClaimed: true } },
                    { new: true }
                );

                if (currentUser) {
                    messageSuccess = "Referral claimed successfully";
                } else {
                    messageSuccess = "Referral cannot be claimed, try again";
                }
            } else {
                messageSuccess = "Invalid referral code, try again with a valid code";
            }
        }

        res.render('user_account', {
            user: userData, cart, productsData: productsData, categories, ordersData: ordersData,
            message: messageSuccess || '',
        });
    } catch (error) {
        console.error('Error in user_apply_referral_code :', error);
        res.status(500).send('Internal Server Error');
    }
};









//user_logOut
const userLogout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/login');
    } catch (error) {
        console.log("error in usercontroller-logout", error.message);
    }
};




// USER TEST
const user_test = async (req, res) => {
    try {
        res.render('user_test')
    } catch (error) {
        console.log("Error in user_test : ", error.message);

    }
}



module.exports = {
    loginLoad,
    verifyLogin,

    registerLoad,
    insertUser,

    verifyOtp,
    resendOtp,

    userHome,
    user_shop_page,
    user_product_page,

    user_account,
    user_edit_details,

    user_change_password_page,
    user_change_password,
    user_forgot_password_page,
    user_forgot_password,
    user_reset_password_page,
    user_reset_password,

    user_add_address_form,
    user_add_address,
    user_edit_address_form,
    user_edit_address,
    user_delete_address,

    user_apply_referral_code,


    userLogout,
    user_test
}