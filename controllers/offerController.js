const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');

const fs = require('fs');
const path = require('path');
const sharp = require("sharp");


// LOAD ADMIN-OFFERS PAGE
const admin_product_offers_list = async (req, res) => {
    try {
        const productsData = await Product.find({ isActive: true })
        res.render('admin_product_offers_list', { productsData })
    } catch (error) {
        console.error("Error in admin_product_offers_list : ", error.message);
        res.status(500).send('Internal Server Error');
    }
}

// admin_individual_product_offer_page
const admin_individual_product_offer_page = async (req, res) => {
    try {
        const productId = req.query.id;
        console.log('productIdn: ', productId)
        const productData = await Product.findById(productId);
        // console.log("productsdata from individual page: ", productData);
        res.render('admin_individual_product_offer_page', { productData, message: '' });
    } catch (error) {
        console.error("Error in admin_individual_product_offer_page: ", error.message);
        res.status(500).send('Internal Server Error');
    }
};

//admin_individual_product_offer
const admin_individual_product_offer = async (req, res) => {
    try {
        const productId = req.body.productId;
        const productToUpdate = await Product.findById(productId);

        console.log(`
            productId is : ${req.body.productId} \n
            percentage is : ${req.body.productOfferPercentage} \n
            date is : ${req.body.productOfferExpiryDate} \n
            status is : ${req.body.isProductOfferActive} \n
            `);

        productToUpdate.productOfferPercentage = req.body.productOfferPercentage;
        productToUpdate.productOfferExpiryDate = req.body.productOfferExpiryDate;
        productToUpdate.isProductOfferActive = req.body.isProductOfferActive;

        await productToUpdate.save();

        if (productToUpdate.isProductOfferActive === true) {
            const productOfferPercentageData = productToUpdate.productOfferPercentage;
            const updatedSalesPrice = Math.round(productToUpdate.regularPrice - (productToUpdate.regularPrice * (productOfferPercentageData / 100)))
            await Product.findByIdAndUpdate(productId, { salesPrice: updatedSalesPrice });

        } else {
            productToUpdate.salesPrice = productToUpdate.regularPrice; // Reset to regular price if offer is not active
        }


        const productData = await Product.findById(productId);


        res.render('admin_individual_product_offer_page', { productData, message: "Offer added successfully" });

    } catch (error) {
        console.error("Error in admin_individual_product_offer: ", error.message);
        res.status(500).send('Internal Server Error');
    }
};


// admin_block_product_offer
const admin_block_product_offer = async (req, res) => {
    try {
        const productId = req.query.productId;
        const productToUpdate = await Product.findById(productId);

        const updatedProduct = await Product.findByIdAndUpdate({ _id: productId }, { $set: { isProductOfferActive: false, salesPrice: productToUpdate.regularPrice } })
        const productData = await Product.findById(productId);


        if (updatedProduct) {
            res.render('admin_individual_product_offer_page', { productData, message: "Product offer blocked successfully" })
            console.log("Product offer blocked");

        } else {
            res.render('admin_individual_product_offer_page', { productData, message: "Something went wrong ! \n Please try again later... " })
            console.log("ERROR IN PRODUCT OFFER BLOCK");

        }
    } catch (error) {
        console.error("Error in admin_block_product_offer: ", error.message);
        res.status(500).send('Internal Server Error');
    }
};

// admin_unblock_product_offer
const admin_unblock_product_offer = async (req, res) => {
    try {
        const productId = req.query.productId;

        const productToUpdate = await Product.findById(productId);
        const productOfferPercentageData = productToUpdate.productOfferPercentage;
        const updatedSalesPrice = Math.round(productToUpdate.regularPrice - (productToUpdate.regularPrice * (productOfferPercentageData / 100)))

        const updatedProduct = await Product.findByIdAndUpdate({ _id: productId }, { $set: { isProductOfferActive: true, salesPrice: updatedSalesPrice } })
        const productData = await Product.findById(productId);

        if (updatedProduct) {
            res.render('admin_individual_product_offer_page', { productData, message: "Product offer unblocked successfully" })
            console.log("Product offer unblocked");

        } else {
            res.render('admin_individual_product_offer_page', { productData, message: "Something went wrong ! \n Please try again later... " })
            console.log("ERROR IN PRODUCT OFFER UNBLOCK");

        }
    } catch (error) {
        console.error("Error in admin_unblock_product_offer: ", error.message);
        res.status(500).send('Internal Server Error');
    }
};


//  CATEGORY


// admin_category_offers_list
const admin_category_offers_list = async (req, res) => {
    try {
        const categoriesData = await Category.find({ isDeleted: false });
        res.render('admin_category_offers_list', { categoriesData });
    } catch (error) {
        console.error("Error in admin_category_offers_list : ", error.message);
        res.status(500).send("Internal Server Error");
    }
};

// admin_add_category_offer_page
const admin_add_category_offer_page = async (req, res) => {
    try {
        console.log('ADMIN_EDIT_CATEGORY_OFFER_PAGE');

        const id = req.query._id
        const categoriesData = await Category.findById({ _id: id })

        if (categoriesData) {
            res.render('admin_add_category_offer_page', { categoriesData, message: "" })
        }
        else {
            res.redirect('/admin/admin_category_offers_list')
        }

    } catch (error) {
        console.error("Error in admin_add_category_offer_page : ", error.message);
        res.status(500).send("Internal Server Error");
    }
};

// admin_add_category_offer
const admin_add_category_offer = async (req, res) => {
    try {
        console.log('ADMIN_EDIT_CATEGORY_OFFER')

        const categoryId = req.body.categoryId;
        const categoryToUpdate = await Category.findById(categoryId);
        categoryToUpdate.categoryOfferPercentage = req.body.categoryOfferPercentage;
        categoryToUpdate.categoryOfferExpiryDate = req.body.categoryOfferExpiryDate;
        categoryToUpdate.isCategoryOfferActive = req.body.isCategoryOfferActive;

        await categoryToUpdate.save();
        const categoriesData = await Category.findById(categoryId);
        res.render('admin_add_category_offer_page', { categoriesData, message: "Offer Updated Successfully" });
    } catch (error) {
        console.error("Error in admin_add_category_offer : ", error.message);
        res.status(500).send("Internal Server Error");
    }
};

// admin_block_category_offer
const admin_block_category_offer = async (req, res) => {
    try {
        console.log('ADMIN_BLOCK_CATEGORY_OFFER')

        const categoryId = req.query.categoryId;

        const updatedCategory = await Category.findByIdAndUpdate({ _id: categoryId }, { $set: { isCategoryOfferActive: false } })
        const categoriesData = await Category.findById(categoryId);

        if (updatedCategory) {
            res.redirect(`/admin/admin_add_category_offer_page?_id=${categoryId}&message=Category offer blocked successfully`); console.log("Category offer blocked ! ");

        } else {
            res.redirect(`/admin/admin_add_category_offer_page?_id=${categoryId}&message=Something went wrong ! \n Please try again later...`);
            // res.render('admin_add_category_offer_page', { categoriesData, message: "Something went wrong ! \n Please try again later... " })
            console.log("ERROR IN CATEGORY OFFER BLOCK");

        }
    } catch (error) {
        console.error("Error in admin_block_category_offer: ", error.message);
        res.status(500).send('Internal Server Error');
    }
};

// admin_unblock_category_offer
const admin_unblock_category_offer = async (req, res) => {
    try {
        console.log('ADMIN_UNBLOCK_CATEGORY_OFFER')

        const categoryId = req.query.categoryId;

        const updatedCategory = await Category.findByIdAndUpdate({ _id: categoryId }, { $set: { isCategoryOfferActive: true } })
        const categoriesData = await Category.findById(categoryId);

        if (updatedCategory) {
            res.redirect(`/admin/admin_add_category_offer_page?_id=${categoryId}&message=Category offer unblocked successfully`);
            // res.render('admin_add_category_offer_page', { categoriesData, message: "Category offer unblocked successfully" })
            console.log("Category offer unblocked ! ");

        } else {
            res.redirect(`/admin/admin_add_category_offer_page?_id=${categoryId}&message=Something went wrong ! \n Please try again later...`);
            // res.render('admin_add_category_offer_page', { categoriesData, message: "Something went wrong ! \n Please try again later... " })
            console.log("ERROR IN CATEGORY OFFER UNBLOCK");

        }
    } catch (error) {
        console.error("Error in admin_unblock_category_offer: ", error.message);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    admin_product_offers_list,
    admin_individual_product_offer_page,
    admin_individual_product_offer,
    admin_block_product_offer,
    admin_unblock_product_offer,

    admin_category_offers_list,
    admin_add_category_offer_page,
    admin_add_category_offer,
    admin_block_category_offer,
    admin_unblock_category_offer
}