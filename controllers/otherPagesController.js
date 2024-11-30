const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');


const about_page = async (req, res) => {
    try {
        const userData = req.session.user_id;
        const categories = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('about_page', { categories, cart, user: userData, })
    } catch (error) {
        console.error("Error in about_page: ", error.message);
    }
}

const contact_page = async (req, res) => {
    try {
        const userData = req.session.user_id;
        const categories = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('contact_page', { categories, cart, user: userData, })
    } catch (error) {
        console.error("Error in contact_page: ", error.message);
    }
}

const terms_page = async (req, res) => {
    try {
        const userData = req.session.user_id;
        const categories = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('terms_page',{ categories, cart, user: userData, })
    } catch (error) {
        console.error("Error in terms_page: ", error.message);
    }
}

const privacy_policy_page = async (req, res) => {
    try {
        const userData = req.session.user_id;
        const categories = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('privacy_policy_page', { categories, cart, user: userData, })
    } catch (error) {
        console.error("Error in privacy_policy_page: ", error.message);
    }
}



module.exports = {
    about_page,
    contact_page,
    terms_page,
    privacy_policy_page
}
