const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');

const fs = require('fs');
const path = require('path');
const sharp = require("sharp");




// PRODUCTS


// admin_products_list
const admin_products_list = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = 6; // Number of datas per page

        const totalCount = await Product.countDocuments({ isActive: true }); // Count only active products
        const totalPages = Math.ceil(totalCount / limit);

        const productsData = await Product.find({ isActive: true }) // Filter to include only non-deleted products
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('admin_products_list', { products: productsData, totalPages, currentPage: page })

    } catch (error) {
        console.log("Error in admin_products_list : ", error.message);
    }
}

// admin_add_product_form
const admin_add_product_form = async (req, res) => {
    try {
        const categoriesData = await Category.find({isActive: true});

        res.render('admin_add_product_form', { categories: categoriesData })
    } catch (error) {
        console.log("Error in admin_add_product_form : ", error.message);

    }
}




// admin_add_product
const admin_add_product = async (req, res) => {
    try {

        const product = new Product({
            productName: req.body.productName,
            model: req.body.model,
            brand: req.body.brand,
            scale: req.body.scale,
            colour: req.body.colour,
            description: req.body.description,
            quantity: req.body.quantity,
            regularPrice: req.body.regularPrice,
            salesPrice: req.body.salesPrice,
            category: req.body.category,
            productImages: [],
        })

        const imagePaths = req.files.map((file) => file.path);

        // Create a new folder for processed images
        const processedImagesFolder = './public/product_images/';
        if (!fs.existsSync(processedImagesFolder)) {
            fs.mkdirSync(processedImagesFolder, { recursive: true });
        }

        // Process and crop images using sharp
        const processedImages = await Promise.all(imagePaths.map(async (imagePath, index) => {
            const uniqueIdentifier = Date.now() + index;

            // Update the outputPath to include the processedImagesFolder
            const outputPath = `${processedImagesFolder}${uniqueIdentifier}_cropped.jpg`;

            await sharp(imagePath)
                .resize(1500, 1000)
                .toFile(outputPath);

            return outputPath;
        }));


        product.productImages = processedImages;

        const productData = await product.save()

        const categoriesData = await Category.find({isActive: true});

        if (productData) {
            res.render('admin_add_product_form', { categories: categoriesData, message: 'Product added Successfully !' })
            console.log('Product Added Successfully !');
        }
        else {
            res.render('admin_add_product_form', { categories: categoriesData, message: 'Product adding Failed !!!' })
            console.log('Product Add has been Failed !!!');

        }

    } catch (error) {
        console.log("Error in admin_add_product : ", error.message);
        console.log("\n" + error);

    }
}





// admin_products_grid
const admin_products_grid = async (req, res) => {
    try {
        const productsData = await Product.find({isActive: true})

        res.render('admin_products_grid', { products: productsData })
    } catch (error) {
        console.log("Error in admin_products_grid : ", error.message);

    }
}

// admin_edit_products_form
const admin_edit_product_form = async (req, res) => {

    try {

        const id = req.query.id

        const productData = await Product.findById({ _id: id })
        const categoriesData = await Category.find({isActive: true});

        if (productData) {
            res.render('admin_edit_product_form', { products: productData, categories: categoriesData })
        }
        else {
            res.redirect('/admin/admin_products_list')
        }

    } catch (error) {
        console.log("Error in admin_edit_product_form:", error.message);
    }
}

//admin_edit_product
const admin_edit_product = async (req, res) => {
    try {
        const productid = await Product.findById(req.query.id);

        // Extract deleted image filenames from the request
        const deletedImages = JSON.parse(req.body.deletedImages || '[]');

        const updatedImages = productid.productImages.filter(image => !deletedImages.includes(image));

        const imagePaths = req.files.map((file) => file.path);

        // Create a new folder for processed images
        const processedImagesFolder = './public/product_images/';
        if (!fs.existsSync(processedImagesFolder)) {
            fs.mkdirSync(processedImagesFolder, { recursive: true });
        }

        // Process and crop images using sharp
        const processedImages = await Promise.all(imagePaths.map(async (imagePath, index) => {
            const uniqueIdentifier = Date.now() + index;

            // Update the outputPath to include the processedImagesFolder
            const outputPath = `${processedImagesFolder}${uniqueIdentifier}_cropped.jpg`;

            await sharp(imagePath)
                .resize({
                    width: 1500,
                    height: 1000,
                     
                })
                .toFile(outputPath);

            return outputPath;
        }));


        const updateData = {
            productName: req.body.productName,
            model: req.body.model,
            brand: req.body.brand,
            scale: req.body.scale,
            colour: req.body.colour,
            description: req.body.description,
            quantity: req.body.quantity,
            regularPrice: req.body.regularPrice,
            salesPrice: req.body.salesPrice,
            category: req.body.category,
            productImages: [...updatedImages, ...processedImages],

        };


        await Product.findByIdAndUpdate(productid, { $set: updateData });

        console.log('Product Edited Successfully!');

        res.redirect('/admin/admin_products_list');

    } catch (error) {

        console.log("Error in admin_edit_product: ", error.message);
        res.redirect('/admin/admin_products_list');
    }
};

//admin_delete_product
const admin_delete_product = async (req, res) => {
    try {

        const id = req.query.id;

        await Product.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } })

        res.redirect('/admin/admin_products_list');

    } catch (error) {
        console.log("Error in admin_delete_product: ", error.message);
    }
}






module.exports = {

    admin_products_list,
    admin_products_grid,
    admin_add_product_form,
    admin_add_product,
    admin_edit_product_form,
    admin_edit_product,
    admin_delete_product,


}


