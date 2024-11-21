const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');

const fs = require('fs');
const path = require('path');
const sharp = require("sharp");




// CATEGORIES


// admin_categories_list
const admin_categories_list = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = 10; // Number of users per page

        const totalCount = await Category.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(totalCount / limit);

        const categoriesData = await Category.find({ isDeleted: false }).skip((page - 1) * limit).limit(limit);


        res.render('admin_categories_list', { categories: categoriesData, totalPages, currentPage: page })
    } catch (error) {
        console.log("Error in admin_categories_list : ", error.message);
    }
}

// admin_add_categories_form
const admin_add_categories_form = async (req, res) => {
    try {
        res.render('admin_add_categories_form')
    } catch (error) {
        console.log("Error in admin_add_categories_form : ", error.message);
    }
}

// admin_add_categories
const admin_add_categories = async (req, res) => {
    try {

        const category = new Category({
            categoryName: req.body.categoryName,
            categoryDescription: req.body.categoryDescription,
        })

        if (req.file) {
            const imagePath = req.file.path;

            const inpath = './public/categoryImages/'
            if (!fs.existsSync(inpath)) {
                fs.mkdirSync(inpath, { recursive: true });
            }
            const processedImagePath = `${inpath}${Date.now()}_cropped.jpg`;

            await sharp(imagePath)
                .resize({ width: 500, height: 500, fit: 'cover' })
                .toFile(processedImagePath);

            category.categoryImages = processedImagePath;

           
        }


        const categoryData = await category.save()

        if (categoryData) {
            res.render('admin_add_categories_form', { message: 'Category added Successfully !' })
            console.log('Category Added Successfully !');
        }
        else {
            res.render('admin_add_categories_form', { message: 'Category adding Failed !!!' })
            console.log('Category Add has been Failed !!!');

        }

    } catch (error) {
        console.log("Error in admin_add_categories : ", error.message);
        res.render('admin_add_categories_form', { message: 'An error occurred, please try again.' });
    }
}

// admin_edit_categories_form
const admin_edit_categories_form = async (req, res) => {

    try {

        const id = req.query.id

        const categoryData = await Category.findById({ _id: id })

        if (categoryData) {
            res.render('admin_edit_categories_form', { categories: categoryData })
        }
        else {
            res.redirect('/admin/admin_categories_list')
        }

    } catch (error) {
        console.log("Error in admin_edit_categories_form:", error.message);
    }
}

//admin_edit_categories
const admin_edit_categories = async (req, res) => {
    try {
        const updateData = {
            categoryName: req.body.categoryName,
            categoryDescription: req.body.categoryDescription,


        };

        if (req.file) {
            const imagePath = req.file.path;

            const inpath = './public/categoryImages/'
            if (!fs.existsSync(inpath)) {
                fs.mkdirSync(inpath, { recursive: true });
            }
            const processedImagePath = `${inpath}${Date.now()}_cropped.jpg`;

            await sharp(imagePath)
                .resize({ width: 500, height: 500, fit: 'cover' })
                .toFile(processedImagePath);

                updateData.categoryImages = processedImagePath;

           
        }

        await Category.findByIdAndUpdate(req.query.id, { $set: updateData });
        console.log('Category Edited Successfully!');


        res.redirect('/admin/admin_categories_list');

    } catch (error) {

        console.log("Error in admin_edit_categories: ", error.message);
        res.redirect('/admin/admin_categories_list');
    }
};

//admin_delete_categories
const admin_delete_categories = async (req, res) => {
    try {

        const id = req.query.id;

        await Category.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } })

        res.redirect('/admin/admin_categories_list');

    } catch (error) {
        console.log("Error in admin_delete_categories: ", error.message);
    }
}







module.exports = {

    admin_categories_list,
    admin_add_categories_form,
    admin_add_categories,
    admin_edit_categories_form,
    admin_edit_categories,
    admin_delete_categories,



}